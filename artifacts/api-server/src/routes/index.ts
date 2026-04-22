import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import featuresRouter from "./features";
import usersRouter from "./users";
import ticketsRouter from "./tickets";
import dashboardRouter from "./dashboard";
import paidRouter from "./paid";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(featuresRouter);
router.use(usersRouter);
router.use(ticketsRouter);
router.use(dashboardRouter);
router.use(paidRouter);

export default router;
