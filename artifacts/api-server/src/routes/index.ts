import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import postersRouter from "./posters";
import activityRouter from "./activity";
import serviceStatusRouter from "./serviceStatus";
import requestsRouter from "./requests";
import downloadsRouter from "./downloads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(postersRouter);
router.use(activityRouter);
router.use(serviceStatusRouter);
router.use(requestsRouter);
router.use(downloadsRouter);

export default router;
