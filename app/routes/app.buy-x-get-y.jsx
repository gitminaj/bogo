import { useNavigate } from "@remix-run/react";
import {
  Page,
  BlockStack,
  Card,
  List,
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
} from "@shopify/polaris";
import { CaretUpIcon, CaretDownIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useCallback, useState } from "react";

export default function Buyxgety() {
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [openSections, setOpenSections] = useState({
    section1: true,
    section2: true,
    section3: true,
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

  // Updated ResourcePicker implementation
  const openPicker = async () => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });

      if (selected) {
        console.log("Products selected:", selected);
        setSelectedProducts(selected);
      } else {
        console.log("Picker was cancelled by the user");
      }
    } catch (error) {
      console.error("Error opening resource picker:", error);
    }
  };

  const handleToggle = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [selected, setSelected] = useState("today");

  const handleSelectChange = (value) => setSelected(value);

  const handleChange = useCallback((value) => setSelected(value), []);

  const options = [
    { label: "Trigger Products", value: "today" },
    { label: "Trigger Collections", value: "yesterday" },
  ];

  return (
    <Page
      title="Create Buy X Get Y"
      backAction={{ content: "Settings", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* card 1 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm" fontWeight="medium">
                  General
                </Text>
                <TextField
                  label="Campaign name"
                  value="Buy X get Y #1"
                  onChange={() => {}}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* card 2 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm" fontWeight="medium">
                  Customer buys
                </Text>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      type="number"
                      label="Minimum quantity of items"
                      onChange={() => {}}
                      autoComplete="off"
                    />
                    <Select
                      label="Any items from"
                      options={options}
                      onChange={handleSelectChange}
                      value={selected}
                    />
                  </FormLayout.Group>
                </FormLayout>
                <InlineStack gap="200" align="center" blockAlign="center">
                  <div style={{ flex: 1 }}>
                    <TextField
                      type="search"
                      onChange={() => {}}
                      autoComplete="off"
                      placeholder="Search products"
                      onFocus={openPicker}
                    />
                  </div>
                  <Button onClick={openPicker} variant="secondary">
                    Browse 
                  </Button>
                </InlineStack>

                {/* Display selected products */}
                {selectedProducts.length > 0 && (
                  <Card sectioned>
                    <Text as="h4" variant="headingSm" fontWeight="medium">
                      Selected Products ({selectedProducts.length})
                    </Text>
                    <BlockStack gap="200">
                      {selectedProducts.map((product) => (
                        <Text key={product.id} as="p">
                          {product.title}
                        </Text>
                      ))}
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            </Card>

            {/* card 3 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingSm" fontWeight="medium">
                  Discount settings
                </Text>
                <ChoiceList
                  title="Company name"
                  choices={[
                    { label: "Hidden", value: "hidden" },
                    { label: "Optional", value: "optional" },
                    { label: "Required", value: "required" },
                  ]}
                  selected={selected}
                  onChange={handleChange}
                />

                <BlockStack>
                  <Text as="h4" variant="headingSm" fontWeight="regular">
                    Combinations
                  </Text>
                  <Checkbox
                    label="Product discounts"
                    checked={selected}
                    onChange={handleChange}
                  />
                  <Checkbox
                    label="Order discounts"
                    checked={selected}
                    onChange={handleChange}
                  />
                  <Checkbox
                    label="Shipping discounts"
                    checked={false}
                    onChange={handleChange}
                  />
                </BlockStack>

                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Maximum discount uses
                    </Text>
                    <p
                      onClick={() => handleToggle("section1")}
                      ariaControls="basic-collapsible"
                    >
                      <Icon
                        source={
                          openSections.section1 ? CaretUpIcon : CaretDownIcon
                        }
                        tone="base"
                      />
                    </p>
                  </InlineStack>
                  <Collapsible
                    open={openSections.section1}
                    id="basic-collapsible"
                    transition={{
                      duration: "500ms",
                      timingFunction: "ease-in-out",
                    }}
                    expandOnPrint
                  >
                    <ChoiceList
                      allowMultiple
                      title=""
                      choices={[
                        {
                          label: "Limit total number of uses",
                          value: "shipping",
                          helpText:
                            "Set a maximum number of times this discount can be used",
                        },

                        {
                          label: "Limit to one use per customer",
                          value: "confirmation",
                          helpText:
                            "Allow each customer to use this discount only once",
                        },
                      ]}
                      selected={selected}
                      onChange={handleChange}
                    />
                  </Collapsible>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* card 5 */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingSm" fontWeight="semibold">
                    Customer eligibility
                  </Text>
                  <p
                    onClick={() => handleToggle("section2")}
                    ariaControls="basic-collapsible-2"
                  >
                    <Icon
                      source={
                        openSections.section2 ? CaretUpIcon : CaretDownIcon
                      }
                      tone="base"
                    />
                  </p>
                </InlineStack>
                <Collapsible
                  open={openSections.section2}
                  id="basic-collapsible-2"
                  transition={{
                    duration: "500ms",
                    timingFunction: "ease-in-out",
                  }}
                  expandOnPrint
                >
                  <ChoiceList
                    title=""
                    choices={[
                      { label: "All customers", value: "hidden" },
                      { label: "Customer segment", value: "optional" },
                      { label: "Specific link", value: "required" },
                      { label: "Customer location", value: "required" },
                    ]}
                    selected={selected}
                    onChange={handleChange}
                  />
                </Collapsible>
              </BlockStack>
            </Card>

            {/* card 6 */}
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
                      onChange={() => {}}
                      autoComplete="off"
                    />
                    <TextField
                      type="time"
                      label="Start time"
                      onChange={() => {}}
                    />
                    <TextField
                      type="date"
                      label="End date"
                      onChange={() => {}}
                      autoComplete="off"
                    />
                    <TextField
                      type="time"
                      label="End time"
                      onChange={() => {}}
                    />
                  </FormLayout.Group>
                </FormLayout>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <LegacyCard title="Tags" sectioned>
            <p>Add tags to your order.</p>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
