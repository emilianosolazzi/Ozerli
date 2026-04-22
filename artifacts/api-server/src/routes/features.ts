import { Router, type IRouter } from "express";
import { getOzerliCapabilities } from "../lib/features";

const router: IRouter = Router();

router.get("/features/capabilities", (_req, res): void => {
  res.json(getOzerliCapabilities());
});

export default router;