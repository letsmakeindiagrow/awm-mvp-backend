import { InvestmentController } from "../controller/investment.controller.js";
import cron from "node-cron";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@prisma/client/edge";

const prisma = new PrismaClient().$extends(withAccelerate());

const Ids = await prisma.user.findMany({
  select: {
    id: true,
  },
});

cron.schedule("* * * * *", () => {
  console.log("quaterly payout job running");
  for (const id of Ids) {
    InvestmentController.processQuaterlyPayout(id.id);
  }
});
``;
