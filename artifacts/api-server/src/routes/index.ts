import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productionRouter from "./production";
import sceneImageRouter from "./scene-image";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productionRouter);
router.use(sceneImageRouter);

export default router;
