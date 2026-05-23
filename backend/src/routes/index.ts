import { Hono } from "hono";
import authRoute from "./auth.route";
import ordersRoute from "./orders.route";
import chatRoute from "./chat.route";
import walletsRoute from "./wallets.route";
import webhooksRoute from "./webhooks.route";

const routes = new Hono();

routes.route("/auth", authRoute);
routes.route("/orders", ordersRoute);
routes.route("/chats", chatRoute);
routes.route("/wallets", walletsRoute);
routes.route("/webhooks", webhooksRoute);

export default routes;
