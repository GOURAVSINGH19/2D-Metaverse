import { Router } from "express";
import { UpdateMetadataSchema } from "../../types";
import client from "@repo/db/client";
import { userMiddleware } from "../../middleware/user";
export const userRouter = Router();

userRouter.post("/metadata", userMiddleware, async (req, res) => {
  const parsedData = UpdateMetadataSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(400).json({ message: "Validation failed" });
    return;
  }

  await client.user.update({
    where: {
      id: req.userId,
    },
    data: {
      avatarId: parsedData.data.avatarId,
    },
  });
  res.json({ message: "Metadata updated successfully" });
});

userRouter.get("/user/metadata/bulk", async (req, res) => {
  const userIdsString = (req.query.ids ?? "[]") as string;
  const userIds = userIdsString.slice(1, userIdsString?.length - 2).split(","); // convert  array  into strings

  const metadata = await client.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: {
      id: true,
      avatar: true,
    },
  });

  res.json({
    avatars: metadata.map((m) => ({
      userIds: m.id,
      avatarId: m.avatar?.imageUrl,
    })),
  });
});
