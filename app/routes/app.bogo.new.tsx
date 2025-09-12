import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { getAdmin } from "../utils/shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function buildFunctionConfig(payload: any) {
  // Shape is up to you; keep it small. This example supports: Buy X (minQty from triggers)
  // get Y (rewardQty from rewardIds) with either free or percent off.
  return {
    version: 1,
    trigger: {
      type: payload.triggerType, // 'products' | 'collections'
      ids: payload.triggerIds, // array of GIDs
      minQty: Number(payload.minQty || 1),
    },
    reward: {
      applyTo: payload.rewardApplyTo, // 'selected' | 'same_as_trigger'
      ids: payload.rewardIds || [], // array of GIDs
      qty: Number(payload.rewardQty || 1),
      kind: payload.rewardType, // 'free' | 'percent' | 'amount'
      value: payload.rewardValue ? Number(payload.rewardValue) : null,
    },
    limits: {
      totalUses: payload.limitTotalUses ? Number(payload.limitTotalUses) : null,
      perCustomer: Boolean(payload.limitPerCustomer),
    },
    strategy: "MAXIMUM", // or FIRST — your function can honor this
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();

  const data = {
    title: String(form.get("title") || "Buy X Get Y"),
    triggerType: String(form.get("triggerType") || "products"),
    triggerIds: JSON.parse(String(form.get("triggerIds") || "[]")),
    minQty: Number(form.get("minQty") || 1),
    rewardType: String(form.get("rewardType") || "free"),
    rewardValue: form.get("rewardValue")
      ? Number(form.get("rewardValue"))
      : null,
    rewardApplyTo: String(form.get("rewardApplyTo") || "selected"),
    rewardIds: JSON.parse(String(form.get("rewardIds") || "[]")),
    rewardQty: Number(form.get("rewardQty") || 1),
    combinesOrder: form.get("combinesOrder") === "on",
    combinesProduct: form.get("combinesProduct") === "on",
    combinesShipping: form.get("combinesShipping") === "on",
    limitTotalUses: form.get("limitTotalUses")
      ? Number(form.get("limitTotalUses"))
      : null,
    limitPerCustomer: form.get("limitPerCustomer") === "on",
    startsAt: new Date(
      String(form.get("startsAt") || new Date().toISOString()),
    ),
    endsAt: form.get("endsAt") ? new Date(String(form.get("endsAt"))) : null,
    functionId: String(form.get("functionId")), // Pass in your deployed Function ID
  };

  const admin = await getAdmin(request);

  // 1) Persist to DB
  const created = await prisma.offer.create({
    data: {
      ...data,
      triggerIds: data.triggerIds,
      rewardIds: data.rewardIds,
    },
  });

  const config = buildFunctionConfig(data);

  // 2) Create the automatic discount attached to your Function
  const mutation = `#graphql
mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
userErrors { field message }
automaticAppDiscount { discountId status }
}
}
`;

  const variables = {
    automaticAppDiscount: {
      title: data.title,
      functionId: data.functionId,
      startsAt: data.startsAt.toISOString(),
      endsAt: data.endsAt ? data.endsAt.toISOString() : null,
      combinesWith: {
        orderDiscounts: data.combinesOrder,
        productDiscounts: data.combinesProduct,
        shippingDiscounts: data.combinesShipping,
      },
      metafields: [
        {
          namespace: "default",
          key: "function-configuration",
          type: "json",
          value: JSON.stringify(config),
        },
      ],
    },
  } as const;

  const resp = await admin.graphql(mutation, { variables });
  const jsonResp = await resp.json();

  const err = jsonResp?.data?.discountAutomaticAppCreate?.userErrors?.[0];
  if (err) {
    // Roll back if needed
    await prisma.offer.delete({ where: { id: created.id } });
    throw new Response(err.message || "Failed to create discount", {
      status: 400,
    });
  }

  const discountId = jsonResp.data.discountAutomaticAppCreate
    .automaticAppDiscount.discountId as string;

  await prisma.offer.update({
    where: { id: created.id },
    data: { discountId, status: "ACTIVE" },
  });

  return redirect(`/app/bogo/${created.id}`);
}
