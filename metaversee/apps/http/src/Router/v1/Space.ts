import { Router } from "express";

export const spaceRouter = Router();

spaceRouter.post("", (req, res) => {});

spaceRouter.delete("/:spaceId", (req, res) => {});

spaceRouter.get("/all", (req, res) => {});

spaceRouter.post("/elment", (req, res) => {});

spaceRouter.delete("/element", (req, res) => {});

spaceRouter.get("/:spaceId", (req, res) => {});
