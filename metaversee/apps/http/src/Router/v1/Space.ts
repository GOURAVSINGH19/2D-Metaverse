import { Router } from "express";
import client from "@repo/db/client";
import {
  AddElementSchema,
  CreateSpaceSchema,
  DeleteElementSchema,
} from "../../types";
import { userMiddleware } from "../../middleware/user";
export const spaceRouter = Router();

spaceRouter.post("/", userMiddleware, async (req, res) => {
  //simple zod validation
  const parsedata = CreateSpaceSchema.safeParse(req.body);

  if (!parsedata.success) {
    res.status(400).json({ message: "Validation failed" });
    return;
  }

  // when user does not want existing space
  //create a empty space
  if (!parsedata.data.mapId) {
    const space = await client.space.create({
      data: {
        name: parsedata.data.name,
        width: parseInt(parsedata.data.dimensions.split("x")[0]),
        height: parseInt(parsedata.data.dimensions.split("x")[1]),
        creatorId: req.userId!,
      },
    });
    res.json({ spaceId: space.id, message: "Space created successfully" });
    return;
  }

  //when user want get the map to duplicate
  // we have to copy all element which present in existing map
  const map = await client.map.findFirst({
    where: {
      id: parsedata.data.mapId,
    },
    select: {
      mapElements: true,
      width: true,
      height: true,
    },
  });
  if (!map) {
    res.status(403).json({ message: "Map not found" });
    return;
  }
  //create a space with the width of map.width and map.height
  // how to handle lots of load during (bookmyshow)
  // creating transactions and locking the database
  let space = await client.$transaction(async () => {
    const space = await client.space.create({
      data: {
        name: parsedata.data.name,
        width: map.width,
        height: map.height,
        creatorId: req.userId!,
      },
    });

    //  space needs to have a bunch of space elements table

    await client.spaceElements.createMany({
      data: map.mapElements.map((e) => ({
        spaceId: space.id,
        elementId: e.elementId,
        x: e.x!,
        y: e.y!,
      })),
    });

    return space;
  });
  res.json({ spaceId: space.id });
});

spaceRouter.delete("/element", userMiddleware, async (req, res) => {
  const parsedata = DeleteElementSchema.safeParse(req.body);
  if (!parsedata.success) {
    res.status(400).json({ message: "Validation failed" });
    return;
  }

  const spaceElement = await client.spaceElements.findFirst({
    where: {
      id: parsedata.data.id,
    },
    include: {
      space: true,
    },
  });

  if (
    !spaceElement?.space.creatorId ||
    spaceElement.space.creatorId !== req.userId
  ) {
    res.status(400).json({ message: "space not found" });
    return;
  }

  await client.spaceElements.delete({
    where: {
      id: parsedata.data.id,
    },
  });

  res.json({ message: "Element deleted" });
});

spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
  const space = await client.space.findUnique({
    where: {
      id: req.params.spaceId,
    },
    select: {
      creatorId: true,
    },
  });
  if (!space) {
    res.status(400).json({ message: "Space not found" });
    return;
  }
  if (space.creatorId !== req.userId) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }
  await client.space.delete({
    where: {
      id: req.params.spaceId,
    },
  });

  res.json({ message: "Space deleted successfully" });
});

spaceRouter.get("/all", userMiddleware, async (req, res) => {
  const spaces = await client.space.findMany({
    where: {
      creatorId: req.userId!,
    },
  });

  res.json({
    spaces: spaces.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail,
      dimensions: `${s.width}x${s.height}`,
    })),
  });
});

spaceRouter.post("/element", userMiddleware, async (req, res) => {
  const parsedData = AddElementSchema.safeParse(req.body)
  if (!parsedData.success) {
      res.status(400).json({message: "Validation failed"})
      return
  }
  const space = await client.space.findUnique({
      where: {
          id: req.body.spaceId,
          creatorId: req.userId!
      }, select: {
          width: true,
          height: true
      }
  })

  if(req.body.x < 0 || req.body.y < 0 || req.body.x > space?.width! || req.body.y > space?.height!) {
      res.status(400).json({message: "Point is outside of the boundary"})
      return
  }

  if (!space) {
      res.status(400).json({message: "Space not found"})
      return
  }
  await client.spaceElements.create({
      data: {
          spaceId: req.body.spaceId,
          elementId: req.body.elementId,
          x: req.body.x,
          y: req.body.y
      }
  })

  res.json({message: "Element added"})
})

spaceRouter.get("/:spaceId", async (req, res) => {
  const space = await client.space.findUnique({
    where: {
      id: req.params.spaceId,
    },
    include: {
      elements: {
        include: {
          element: true,
        },
      },
    },
  });

  if (!space) {
    res.status(400).json({ message: "Space not found" });
    return;
  }
  res.json({
    dimensions: `${space.width}x${space.height}`,
    elements: space.elements.map((e) => ({
      id: e.id,
      elment: {
        id: e.element.id,
        imageUrl: e.element.imageUrl,
        static: e.element.static,
        width: e.element.width,
        height: e.element.height,
      },
      x: e.x,
      y: e.y,
    })),
  });
});
