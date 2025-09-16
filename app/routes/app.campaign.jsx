import React, { useState, useCallback } from "react";
import {
  Page,
  Card,
  DataTable,
  Badge,
  Tabs,
  Text,
  InlineStack,
  Icon,
  ButtonGroup,
  Button,
  Modal,
} from "@shopify/polaris";
import { EditIcon, DeleteIcon } from "@shopify/polaris-icons";
import { json, redirect, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";

import prisma  from "../db.server"; 

export async function loader({ request }) {
  // Fetch campaigns/offers from DB
  const campaigns = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" }, // optional
  });

  console.log('campaigns', campaigns)

  return json({ campaigns });
}

export async function action({ request }) {
  const formData = await request.formData();
  const id = formData.get("id");

  if (typeof id !== "string") {
    return json({ error: "Invalid id" }, { status: 400 });
  }

  await prisma.offer.delete({ where: { id } });

  return redirect("/app/campaign");
}


export default function CampaignList() {
  const [selectedTab, setSelectedTab] = useState(0);
    const navigate = useNavigate();
    const { campaigns } = useLoaderData();

    const fetcher = useFetcher();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  const handleDeleteClick = (id) => {
    setCampaignToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (campaignToDelete) {
      fetcher.submit({ id: campaignToDelete }, { method: "post" });
      setDeleteModalOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setCampaignToDelete(null);
  };

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTab(selectedTabIndex),
    []
  );

  const tabs = [
    { id: "all", content: "All", accessibilityLabel: "All campaigns" },
    { id: "active", content: "Active" },
    { id: "scheduled", content: "Scheduled" },
    { id: "expired", content: "Expired" },
  ];

  const rows = campaigns.map((c) => [
    <Text variant="bodyMd" fontWeight="bold">{c.title}</Text>,
    <Badge tone={c.status === "Active" ? "success" : "critical"}>
      {c.status}
    </Badge>,
    c.type,
    // String(c.used),
    <>
      <Text>Product discounts</Text>
      <br />
      <Text>Order discounts</Text>
    </>,
    // String(c.views),
    // String(c.atcs),
    // `${c.cr}%`,
    // `₹${c.revenue}`,
    <InlineStack gap="100">
      <Icon
        source={EditIcon}
        tone="base"
        onClick={() => navigate(`/campaigns/${c.id}/edit`)}
      />
      <Button icon={DeleteIcon} onClick={() => handleDeleteClick(c.id)} />

    </InlineStack>,
  ]);

  return (
    <Page
      title="Campaign list"
      subtitle="Manage your campaigns"
      primaryAction={{
        content: "Create campaign",
        onAction: () => navigate("/app"),
      }}
    >
      <Card>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
          <Card>
            <DataTable
              columnContentTypes={[
                "text", "text", "text",
                //  "numeric",
                  "text",
                // "numeric", "numeric", "numeric", "numeric",
                 "text"
              ]}
              headings={[
                "Campaign name",
                "Status",
                "Campaign type",
                // "Used",
                "Combinations",
                // "Views",
                // "ATCs",
                // "CR",
                // "Revenue",
                "Actions",
              ]}
              rows={rows}
            />
          </Card>
        </Tabs>
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={handleCancelDelete}
        title="Delete campaign?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleConfirmDelete,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleCancelDelete,
          },
        ]}
      >
        <Modal.Section>
          <Text>
            Are you sure you want to delete this campaign? This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
