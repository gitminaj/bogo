import { authenticate } from "../shopify.server"; 

export async function getAdmin(request) {
  const { admin } = await authenticate.admin(request);
  return admin;
}
