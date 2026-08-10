import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import departmentsRouter from "./departments";
import employeesRouter from "./employees";
import reportsRouter from "./reports";
import notificationsRouter from "./notifications";
import activityLogsRouter from "./activityLogs";
import auditLogsRouter from "./auditLogs";
import analyticsRouter from "./analytics";
import managementRouter from "./management";
import settingsRouter from "./settings";
import emailRouter from "./email";
import aiRouter from "./ai";
import workflowsRouter from "./workflows";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(departmentsRouter);
router.use(employeesRouter);
router.use(reportsRouter);
router.use(notificationsRouter);
router.use(activityLogsRouter);
router.use(auditLogsRouter);
router.use(analyticsRouter);
router.use(managementRouter);
router.use(settingsRouter);
router.use(emailRouter);
router.use(aiRouter);
router.use(workflowsRouter);

export default router;
