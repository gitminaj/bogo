import { json } from "@remix-run/node";
import { useNavigate, useActionData, Form } from "@remix-run/react";
import {
  Page,
  BlockStack,
  Card,
  Text,
  TextField,
  LegacyCard,
  Layout,
  FormLayout,
  Select,
  ChoiceList,
  Checkbox,
  InlineStack,
  Button,
  Collapsible,
  Icon,
  Banner,
  ResourceList,
  Thumbnail,
} from "@shopify/polaris";
import { CaretUpIcon, CaretDownIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// SERVER-SIDE ACTION (using direct function ID)
// SERVER-SIDE ACTION using BXGY mutation
export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();

    const offerDataString = formData.get("offerData");
    if (!offerDataString) {
      throw new Error("No offer data received");
    }

    const data = JSON.parse(offerDataString);
    console.log("Parsed offer data:", data);

    // Save in DB first
    const offer = await prisma.offer.create({
      data: {
        title: data.title,
        triggerType: data.triggerType,
        triggerIds: data.selectedProducts.map((p) => p.id),
        minQty: parseInt(data.minQuantity, 10),
        rewardType: "free",
        rewardValue: null,
        rewardApplyTo: "selected",
        rewardIds: [],
        rewardQty: 1,
        combinesOrder: data.combines?.orderDiscounts || false,
        combinesProduct: data.combines?.productDiscounts || false,
        combinesShipping: data.combines?.shippingDiscounts || false,
        limitTotalUses: data.usageLimits?.includes("limit_total") ? null : null,
        limitPerCustomer:
          data.usageLimits?.includes("limit_per_customer") || false,
        startsAt: new Date(`${data.startsAt}T${data.startTime || "00:00"}:00Z`),
        endsAt: data.endsAt
          ? new Date(`${data.endsAt}T${data.endTime || "23:59"}:00Z`)
          : null,
        functionId: "0199377a-e148-7a61-bedb-f7d25bd5d3ab", // BXGY doesn't need function ID
        status: "DRAFT",
      },
    });

    // Use BXGY mutation instead
    const mutation = `
      mutation discountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
        discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
          userErrors {
            field
            message
          }
          automaticDiscountNode {
            id
            automaticDiscount {
              ... on DiscountAutomaticBxgy {
                title
                status
                startsAt
                endsAt
                customerBuys {
                  value {
                    ... on DiscountQuantity {
                      quantity
                    }
                  }
                  items {
                    ... on DiscountProducts {
                      products(first: 10) {
                        nodes {
                          id
                        }
                      }
                    }
                  }
                }
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                  }
                  items {
                    ... on DiscountProducts {
                      products(first: 10) {
                        nodes {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    var variables = {
      automaticBxgyDiscount: {
        title: data.title,
        startsAt: new Date(
          `${data.startsAt}T${data.startTime || "00:00"}:00Z`,
        ).toISOString(),
        endsAt: data.endsAt
          ? new Date(
              `${data.endsAt}T${data.endTime || "23:59"}:00Z`,
            ).toISOString()
          : null,

        customerBuys: {
          value: {
            quantity: parseInt(data.minQuantity, 10).toString(),
          },
          items: {
            products: {
              productsToAdd: data.selectedProducts.map((p) => p.id),
            },
          },
        },

        customerGets: {
          value: {
            discountOnQuantity: {
              quantity: data.getQuantity.toString(),
              effect: {
                percentage: 1, // 100% off = FREE
              },
            },
          },
          items: {
            products: {
              productsToAdd: data.getProducts.map((p) => p.id),
            },
          },
        },

        combinesWith: {
          orderDiscounts: data.combines?.orderDiscounts || false,
          productDiscounts: data.combines?.productDiscounts || false,
          shippingDiscounts: data.combines?.shippingDiscounts || false,
        },
        usesPerOrderLimit: "1",
      },
    };

    console.log("BXGY GraphQL Variables:", JSON.stringify(variables, null, 2));

    const response = await admin.graphql(mutation, { variables });
    const jsonResponse = await response.json();

    console.log(
      "Shopify BXGY API Response:",
      JSON.stringify(jsonResponse, null, 2),
    );

    if (
      jsonResponse?.data?.discountAutomaticBxgyCreate?.userErrors?.length > 0
    ) {
      const errors = jsonResponse.data.discountAutomaticBxgyCreate.userErrors;
      console.error("Shopify BXGY API Errors:", errors);
      throw new Error(errors.map((e) => e.message).join(", "));
    }

    if (
      !jsonResponse?.data?.discountAutomaticBxgyCreate?.automaticDiscountNode
    ) {
      console.error("No discount created in BXGY response:", jsonResponse);
      throw new Error("Failed to create BXGY discount");
    }

    console.log(
      "Shopify BXGY API Success:",
      jsonResponse.data.discountAutomaticBxgyCreate,
    );

    return json({
      success: true,
      data: offer,
      shopify:
        jsonResponse.data.discountAutomaticBxgyCreate.automaticDiscountNode,
      message: "BOGO offer created using BXGY discount!",
    });
  } catch (error) {
    console.error("Error creating BXGY offer:", error);
    console.log("BXGY GraphQL Variables:", JSON.stringify(variables, null, 2));

    return json(
      {
        success: false,
        error: error.message || "Failed to create BXGY offer",
        variables,
      },
      { status: 500 },
    );
  }
}

// CLIENT-SIDE COMPONENT
export default function BuyXGetY() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const actionData = useActionData();

  // Form state
  const [formData, setFormData] = useState({
    title: "Buy X get Y #1",

    // Customer buys
    minQuantity: "",
    triggerType: "products",
    selectedProducts: [],

    // Customer gets
    getQuantity: "",
    getType: "products",
    getProducts: [],

    discountType: [],
    combines: {
      productDiscounts: false,
      orderDiscounts: false,
      shippingDiscounts: false,
    },
    usageLimits: [],
    customerEligibility: "all",
    startsAt: "",
    startTime: "",
    endsAt: "",
    endTime: "",
  });

  const [openSections, setOpenSections] = useState({
    section1: true,
    section2: true,
    section3: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle successful submission
  useEffect(() => {
    if (actionData?.success) {
      setIsSubmitting(false);
      // Redirect to offers list or show success message
      setTimeout(() => {
        navigate("/app");
      }, 2000);
    } else if (actionData?.error) {
      setIsSubmitting(false);
    }
  }, [actionData, navigate]);

  // Handle toggle for collapsible sections
  const handleToggle = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const openBuyPicker = async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });

      if (selected && selected.length > 0) {
        setFormData((prev) => ({
          ...prev,
          selectedProducts: selected,
        }));
      }
    } catch (error) {
      console.error("Error opening Buy picker:", error);
    }
  };

  const openGetPicker = async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });

      if (selected && selected.length > 0) {
        setFormData((prev) => ({
          ...prev,
          getProducts: selected,
        }));
      }
    } catch (error) {
      console.error("Error opening Get picker:", error);
    }
  };

  // Generic form change handler
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCombinesChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      combines: {
        ...prev.combines,
        [field]: value,
      },
    }));
  };

  // Form validation
  const validateForm = () => {
    const errors = [];
    if (!formData.title.trim()) errors.push("Campaign name is required");
    if (!formData.minQuantity || parseInt(formData.minQuantity) < 1) {
      errors.push("Minimum quantity must be at least 1");
    }
    if (formData.selectedProducts.length === 0) {
      errors.push("At least one product must be selected");
    }
    if (!formData.startsAt) errors.push("Start date is required");

    return errors;
  };

  // Handle form submission
  const handleSubmit = (event) => {
    const errors = validateForm();
    if (errors.length > 0) {
      event.preventDefault();
      alert("Please fix the following errors:\n" + errors.join("\n"));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    // Let the form submit naturally to Remix action
  };

  return (
    <Page
      title="Create Buy X Get Y"
      backAction={{ content: "Settings", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Show success/error messages */}
            {actionData?.success && (
              <Banner status="success" title="Success!">
                <p>{actionData.message}</p>
              </Banner>
            )}

            {actionData?.error && (
              <Banner status="critical" title="Error">
                <p>{actionData.error}</p>
              </Banner>
            )}

            <Form method="post" onSubmit={handleSubmit}>
              {/* Hidden input to pass form data */}
              <input
                type="hidden"
                name="offerData"
                value={JSON.stringify(formData)}
              />

              {/* General */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm" fontWeight="medium">
                    General
                  </Text>
                  <TextField
                    label="Campaign name"
                    value={formData.title}
                    onChange={(val) => handleChange("title", val)}
                    autoComplete="off"
                    required
                  />
                </BlockStack>
              </Card>

              {/* Customer Buys */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm" fontWeight="medium">
                    Customer buys
                  </Text>

                  {/* Responsive row */}
                  <InlineStack gap="400" wrap>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <TextField
                        type="number"
                        label="Minimum quantity of items"
                        value={formData.minQuantity}
                        onChange={(val) => handleChange("minQuantity", val)}
                        autoComplete="off"
                        min="1"
                        required
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <Select
                        label="Any items from"
                        options={[
                          { label: "Trigger Products", value: "products" },
                          {
                            label: "Trigger Collections",
                            value: "collections",
                          },
                        ]}
                        value={formData.triggerType}
                        onChange={(val) => handleChange("triggerType", val)}
                      />
                    </div>

                    <div style={{ alignSelf: "end", minWidth: "120px" }}>
                      <Button
                        onClick={openBuyPicker}
                        variant="secondary"
                        fullWidth
                      >
                        Browse
                      </Button>
                    </div>
                  </InlineStack>

                  {/* Display selected products */}
                  {formData.selectedProducts.length > 0 && (
                    <Card sectioned>
                      <Text as="h4" variant="headingSm" fontWeight="medium">
                        Buy Products ({formData.selectedProducts.length})
                      </Text>
                      <ResourceList
                        resourceName={{
                          singular: "product",
                          plural: "products",
                        }}
                        items={formData.selectedProducts}
                        renderItem={(product) => {
                          const media = (
                            <Thumbnail
                              source={
                                product.images?.[0]?.originalSrc ||
                                product.image?.src ||
                                ""
                              }
                              alt={product.title}
                              size="small"
                            />
                          );
                          return (
                            <ResourceList.Item id={product.id} media={media}>
                              <Text variant="bodyMd" as="span">
                                {product.title}
                              </Text>
                              <div>

                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    selectedProducts:
                                      prev.selectedProducts.filter(
                                        (p) => p.id !== product.id,
                                      ),
                                  }))
                                }

                              >
                                Remove
                              </Button>
                              </div>
                            </ResourceList.Item>
                          );
                        }}
                      />
                    </Card>
                  )}
                </BlockStack>
              </Card>

              {/* customer gets */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm" fontWeight="medium">
                    Customer Gets
                  </Text>

                  <InlineStack gap="400" wrap>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <TextField
                        type="number"
                        label="Quantity of items"
                        value={formData.getQuantity}
                        onChange={(val) => handleChange("getQuantity", val)}
                        autoComplete="off"
                        min="1"
                        required
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <Select
                        label="Any items from"
                        options={[
                          { label: "Products", value: "products" },
                          { label: "Collections", value: "collections" },
                        ]}
                        value={formData.getType}
                        onChange={(val) => handleChange("getType", val)}
                      />
                    </div>

                    <div style={{ alignSelf: "end", minWidth: "120px" }}>
                      <Button
                        onClick={openGetPicker}
                        variant="secondary"
                        fullWidth
                      >
                        Browse
                      </Button>
                    </div>
                  </InlineStack>

                  {formData.getProducts.length > 0 && (
                    <Card sectioned>
                      <Text as="h4" variant="headingSm" fontWeight="medium">
                        Get Products ({formData.getProducts.length})
                      </Text>
                      <ResourceList
                        resourceName={{
                          singular: "product",
                          plural: "products",
                        }}
                        items={formData.getProducts}
                        renderItem={(product) => {
                          const media = (
                            <Thumbnail
                              source={
                                product.images?.[0]?.originalSrc ||
                                product.image?.src ||
                                ""
                              }
                              alt={product.title}
                              size="small"
                            />
                          );
                          return (
                            <ResourceList.Item id={product.id} media={media}>
                              <Text variant="bodyMd" as="span">
                                {product.title}
                              </Text>
                              <div>

                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    getProducts: prev.getProducts.filter(
                                      (p) => p.id !== product.id,
                                    ),
                                  }))
                                }
                              >
                                Remove
                              </Button>
                              </div>
                            </ResourceList.Item>
                          );
                        }}
                      />
                    </Card>
                  )}
                </BlockStack>
              </Card>

              {/* Discount Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm" fontWeight="medium">
                    Discount settings
                  </Text>
                  <ChoiceList
                    allowMultiple
                    title="Discount Type"
                    choices={[
                      { label: "Hidden", value: "hidden" },
                      { label: "Optional", value: "optional" },
                      { label: "Required", value: "required" },
                    ]}
                    selected={formData.discountType}
                    onChange={(val) => handleChange("discountType", val)}
                  />

                  <BlockStack>
                    <Text as="h4" variant="headingSm" fontWeight="regular">
                      Combinations
                    </Text>
                    <Checkbox
                      label="Product discounts"
                      checked={formData.combines.productDiscounts}
                      onChange={(val) =>
                        handleCombinesChange("productDiscounts", val)
                      }
                    />
                    <Checkbox
                      label="Order discounts"
                      checked={formData.combines.orderDiscounts}
                      onChange={(val) =>
                        handleCombinesChange("orderDiscounts", val)
                      }
                    />
                    <Checkbox
                      label="Shipping discounts"
                      checked={formData.combines.shippingDiscounts}
                      onChange={(val) =>
                        handleCombinesChange("shippingDiscounts", val)
                      }
                    />
                  </BlockStack>

                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        Maximum discount uses
                      </Text>
                      <p
                        onClick={() => handleToggle("section1")}
                        style={{ cursor: "pointer" }}
                      >
                        <Icon
                          source={
                            openSections.section1 ? CaretUpIcon : CaretDownIcon
                          }
                          tone="base"
                        />
                      </p>
                    </InlineStack>
                    <Collapsible open={openSections.section1}>
                      <ChoiceList
                        allowMultiple
                        title=""
                        choices={[
                          {
                            label: "Limit total number of uses",
                            value: "limit_total",
                            helpText:
                              "Set a maximum number of times this discount can be used",
                          },
                          {
                            label: "Limit to one use per customer",
                            value: "limit_per_customer",
                            helpText:
                              "Allow each customer to use this discount only once",
                          },
                        ]}
                        selected={formData.usageLimits}
                        onChange={(val) => handleChange("usageLimits", val)}
                      />
                    </Collapsible>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Customer Eligibility */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Customer eligibility
                    </Text>
                    <p
                      onClick={() => handleToggle("section2")}
                      style={{ cursor: "pointer" }}
                    >
                      <Icon
                        source={
                          openSections.section2 ? CaretUpIcon : CaretDownIcon
                        }
                        tone="base"
                      />
                    </p>
                  </InlineStack>
                  <Collapsible open={openSections.section2}>
                    <ChoiceList
                      title=""
                      choices={[
                        { label: "All customers", value: "all" },
                        { label: "Customer segment", value: "segment" },
                        { label: "Specific link", value: "link" },
                        { label: "Customer location", value: "location" },
                      ]}
                      selected={[formData.customerEligibility]}
                      onChange={(val) =>
                        handleChange("customerEligibility", val[0])
                      }
                    />
                  </Collapsible>
                </BlockStack>
              </Card>

              {/* Schedule */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm" fontWeight="medium">
                    Schedule
                  </Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        type="date"
                        label="Start date"
                        value={formData.startsAt}
                        onChange={(val) => handleChange("startsAt", val)}
                        required
                      />
                      <TextField
                        type="time"
                        label="Start time"
                        value={formData.startTime}
                        onChange={(val) => handleChange("startTime", val)}
                      />
                      <TextField
                        type="date"
                        label="End date"
                        value={formData.endsAt}
                        onChange={(val) => handleChange("endsAt", val)}
                      />
                      <TextField
                        type="time"
                        label="End time"
                        value={formData.endTime}
                        onChange={(val) => handleChange("endTime", val)}
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>

              {/* Submit Button */}
              <InlineStack align="end">
                <Button variant="primary" submit loading={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Offer"}
                </Button>
              </InlineStack>
            </Form>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <LegacyCard title="Preview" sectioned>
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm" fontWeight="medium">
                {formData.title || "Campaign Name"}
              </Text>
              <Text as="p" color="subdued">
                Buy {formData.minQuantity || "X"} items, get Y free
              </Text>
              {formData.selectedProducts.length > 0 && (
                <Text as="p" color="subdued">
                  Applies to {formData.selectedProducts.length} product(s)
                </Text>
              )}
              {formData.startsAt && (
                <Text as="p" color="subdued">
                  Starts: {formData.startsAt}
                </Text>
              )}
            </BlockStack>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
