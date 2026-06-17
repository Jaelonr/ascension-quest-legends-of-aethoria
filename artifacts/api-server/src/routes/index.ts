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

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
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

export default router;
