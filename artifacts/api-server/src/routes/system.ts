import { Router } from "express";
import { getSystemKnowledgeBase } from "../system-recommendations";

const router = Router();

router.get("/system/knowledge-base", (_req, res) => {
  res.json(getSystemKnowledgeBase());
});

export default router;
