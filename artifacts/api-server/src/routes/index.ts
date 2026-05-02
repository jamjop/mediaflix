import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import activityRouter from "./activity";
import downloadsRouter from "./downloads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(activityRouter);
router.use(downloadsRouter);

export default router;
