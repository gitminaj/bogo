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
} from "@shopify/polaris";
import { useCallback, useState } from "react";

export default function Buyxgety() {
  const navigate = useNavigate();

  const [selected, setSelected] = useState("today");

  const handleSelectChange = useCallback((value) => setSelected(value), []);

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
                <TextField
                  type="search"
                  onChange={() => {}}
                  autoComplete="off"
                  placeholder="Search products"
                />
              </BlockStack>
            </Card>

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
