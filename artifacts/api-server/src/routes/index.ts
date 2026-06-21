import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import playerRouter from "./player";
import nutritionRouter from "./nutrition";
import equipmentRouter from "./equipment";
import trainingRouter from "./training";
import skillsRouter from "./skills";
import questsRouter from "./quests";
import inventoryRouter from "./inventory";
import analyticsRouter from "./analytics";
import dashboardRouter from "./dashboard";
import plannerRouter from "./planner";
import bossRaidsRouter from "./boss-raids";
import profileRouter from "./profile";
import exercisesRouter from "./exercises";
import armoryRouter from "./armory";
import guildsRouter from "./guilds";
import pushRouter from "./push";
import battleLogRouter from "./battle-log";
import guildMasterRouter from "./guild-master";
import wearablesRouter from "./wearables";
import devMockRouter from "./dev-mock";
import guildHallRouter from "./guild-hall";
import chronicleRouter from "./chronicle";
import characterRouter from "./character";
import campaignRouter from "./campaign";

const router: IRouter = Router();
const devAuthBypass =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
const devMockApi =
  process.env.NODE_ENV !== "production" && process.env.DEV_MOCK_API === "true";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (devAuthBypass) {
    req.userId = process.env.DEV_AUTH_USER_ID ?? "dev-user";
    next();
    return;
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

router.use(healthRouter);
router.use(requireAuth);
if (devMockApi) {
  router.use(devMockRouter);
}
router.use(playerRouter);
router.use(nutritionRouter);
router.use(equipmentRouter);
router.use(trainingRouter);
router.use(skillsRouter);
router.use(questsRouter);
router.use(inventoryRouter);
router.use(analyticsRouter);
router.use(dashboardRouter);
router.use(plannerRouter);
router.use(bossRaidsRouter);
router.use(profileRouter);
router.use(exercisesRouter);
router.use(armoryRouter);
router.use(guildsRouter);
router.use(pushRouter);
router.use(battleLogRouter);
router.use(guildMasterRouter);
router.use(wearablesRouter);
router.use(guildHallRouter);
router.use(chronicleRouter);
router.use(characterRouter);
router.use(campaignRouter);

export default router;
