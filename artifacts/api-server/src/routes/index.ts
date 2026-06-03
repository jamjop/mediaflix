import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import postersRouter from "./posters";
import activityRouter from "./activity";
import recentlyAddedRouter from "./recentlyAdded";
import serviceStatusRouter from "./serviceStatus";
import requestsRouter from "./requests";
import downloadsRouter from "./downloads";
import accessRequestRouter from "./accessRequest";
import authRouter from "./auth";
import metricsRouter from "./metrics";
import streamRouter from "./stream";
import diskspaceRouter from "./diskspace";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(postersRouter);
router.use(activityRouter);
router.use(recentlyAddedRouter);
router.use(serviceStatusRouter);
router.use(requestsRouter);
router.use(downloadsRouter);
router.use(accessRequestRouter);
router.use(authRouter);
router.use(metricsRouter);
router.use(streamRouter);
router.use(diskspaceRouter);

export default router;
