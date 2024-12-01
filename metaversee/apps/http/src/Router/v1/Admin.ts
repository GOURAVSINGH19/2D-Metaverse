import { Router } from "express";

export const adminRouter = Router();

adminRouter.post("/admin/:spaceId", (req, res) => {});

adminRouter.put("/admin/element/:elementId", (req, res) => {});

adminRouter.get("/avatar", (req, res) => {});

adminRouter.get("/map", (req, res) => {});
