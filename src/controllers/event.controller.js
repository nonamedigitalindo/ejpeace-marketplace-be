const eventService = require("../services/event.service");
const EventImageRepository = require("../models/eventImage.repository");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  validationErrorResponse,
} = require("../utils/response.util");

const getAllEvents = async (req, res) => {
  try {
    const events = await eventService.getAllEvents();
    return successResponse(res, "Events retrieved successfully", events);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve events");
    }
    return errorResponse(res, "Failed to retrieve events", error.message);
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventService.getEventById(id);

    if (!event) {
      return notFoundResponse(res, "Event not found");
    }

    return successResponse(res, "Event retrieved successfully", event);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to retrieve event");
    }
    return errorResponse(res, "Failed to retrieve event", error.message);
  }
};

const createEvent = async (req, res) => {
  try {
    console.log("Create event request received");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    console.log("Request file:", req.file);

    // Validate that request body exists
    if (!req.body) {
      return validationErrorResponse(res, ["Request body is required"]);
    }

    // Prepare event data (without images - images will be saved separately)
    const eventData = { ...req.body };

    // Handle files from different possible field names
    let imageFiles = [];
    if (req.files && Array.isArray(req.files)) {
      // Standard array upload
      imageFiles = req.files;
    } else if (
      req.files &&
      req.files.images &&
      Array.isArray(req.files.images)
    ) {
      // Nested files object (from field name "images")
      imageFiles = req.files.images;
    } else if (req.files && req.files.image && Array.isArray(req.files.image)) {
      // Nested files object (from field name "image")
      imageFiles = req.files.image;
    } else if (req.file) {
      // Single file upload
      imageFiles = [req.file];
    }

    console.log("Processed image files:", imageFiles.length);

    // Create the event first
    const event = await eventService.createEvent(eventData);

    // If files were uploaded, save them to event_images table (UNLIMITED)
    if (imageFiles.length > 0) {
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://212.85.27.163"
          : `http://localhost:${process.env.PORT || 3000}`;

      // Prepare images array for bulk insert
      const imagesData = imageFiles.map((file, index) => ({
        image_url: `${baseUrl}/api/v1/uploads/${file.filename}`,
        position: index,
      }));

      // Save all images to event_images table
      await EventImageRepository.createMany(event.id, imagesData);
      console.log(`Saved ${imageFiles.length} images for event ${event.id}`);

      // Reload event to include the images
      const updatedEvent = await eventService.getEventById(event.id);
      return successResponse(res, "Event created successfully", updatedEvent, 201);
    }

    return successResponse(res, "Event created successfully", event, 201);
  } catch (error) {
    console.log("Error creating event:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to create event");
    }
    return errorResponse(res, "Failed to create event", error.message, 400);
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Update event request received for ID:", id);
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    console.log("Request file:", req.file);

    // Validate that request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      // If no body and no file, return error
      let hasFiles = false;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        hasFiles = true;
      } else if (
        req.files &&
        req.files.images &&
        Array.isArray(req.files.images) &&
        req.files.images.length > 0
      ) {
        hasFiles = true;
      } else if (
        req.files &&
        req.files.image &&
        Array.isArray(req.files.image) &&
        req.files.image.length > 0
      ) {
        hasFiles = true;
      } else if (req.file) {
        hasFiles = true;
      }

      if (!hasFiles) {
        return validationErrorResponse(res, [
          "Request body or file is required",
        ]);
      }
    }

    // Prepare update data (without images)
    const updateData = { ...req.body };

    // Debug: log all fields received in body
    console.log("=== DEBUG: All body fields ===");
    console.log("Body keys:", Object.keys(updateData));
    console.log("deletedImages field:", updateData.deletedImages);
    console.log("deleted_images field:", updateData.deleted_images);

    // Handle deletedImages - delete images by ID (support both camelCase and snake_case)
    const deletedImagesField = updateData.deletedImages || updateData.deleted_images;
    if (deletedImagesField) {
      try {
        let imagesToDelete = deletedImagesField;

        // Parse if it's a JSON string
        if (typeof imagesToDelete === 'string') {
          imagesToDelete = JSON.parse(imagesToDelete);
        }

        console.log("Images to delete:", imagesToDelete);

        if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
          const fs = require("fs");
          const path = require("path");

          for (const imageIdentifier of imagesToDelete) {
            let image = null;

            // Check if it's a numeric ID or a URL string
            if (typeof imageIdentifier === 'number' || /^\d+$/.test(imageIdentifier)) {
              // It's a numeric ID
              image = await EventImageRepository.findById(imageIdentifier);
              console.log(`Looking up image by ID ${imageIdentifier}:`, image);
            } else if (typeof imageIdentifier === 'string') {
              // It's a URL string - find by URL pattern
              image = await EventImageRepository.findByUrlPattern(id, imageIdentifier);
              console.log(`Looking up image by URL pattern "${imageIdentifier}":`, image);
            }

            if (image && image.event_id == id) {
              // Delete physical file
              try {
                const filename = image.image_url.split("/").pop();
                if (filename) {
                  const filePath = path.join(__dirname, "../../uploads", filename);
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[EventController] Deleted image file: ${filePath}`);
                  }
                }
              } catch (fileErr) {
                console.error("[EventController] Error deleting image file:", fileErr);
                // Continue even if file deletion fails
              }

              // Delete from database
              await EventImageRepository.delete(image.id);
              console.log(`[EventController] Deleted image record: ${image.id}`);
            } else {
              console.log(`[EventController] Image "${imageIdentifier}" not found or doesn't belong to event ${id}`);
            }
          }
        }
      } catch (parseError) {
        console.error("[EventController] Error parsing deletedImages:", parseError);
        // Continue with update even if deletion fails
      }

      // Remove deletedImages from updateData so it's not passed to the event update
      delete updateData.deletedImages;
      delete updateData.deleted_images;
    }

    // Handle files from different possible field names
    let imageFiles = [];
    if (req.files && Array.isArray(req.files)) {
      // Standard array upload
      imageFiles = req.files;
    } else if (
      req.files &&
      req.files.images &&
      Array.isArray(req.files.images)
    ) {
      // Nested files object (from field name "images")
      imageFiles = req.files.images;
    } else if (req.files && req.files.image && Array.isArray(req.files.image)) {
      // Nested files object (from field name "image")
      imageFiles = req.files.image;
    } else if (req.file) {
      // Single file upload
      imageFiles = [req.file];
    }

    console.log("Processed image files for update:", imageFiles.length);

    // Update event data first
    const event = await eventService.updateEvent(id, updateData);

    if (!event) {
      return notFoundResponse(res, "Event not found");
    }

    // If files were uploaded, add them to event_images table (UNLIMITED)
    // New images are ADDED to existing ones, not replacing
    if (imageFiles.length > 0) {
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://212.85.27.163"
          : `http://localhost:${process.env.PORT || 3000}`;

      // Get next position for new images
      const nextPosition = await EventImageRepository.getNextPosition(id);

      // Prepare images array for bulk insert
      const imagesData = imageFiles.map((file, index) => ({
        image_url: `${baseUrl}/api/v1/uploads/${file.filename}`,
        position: nextPosition + index,
      }));

      // Save all new images to event_images table
      await EventImageRepository.createMany(id, imagesData);
      console.log(`Added ${imageFiles.length} new images for event ${id}`);

      // Reload event to include all images
      const updatedEvent = await eventService.getEventById(id);
      return successResponse(res, "Event updated successfully", updatedEvent);
    }

    return successResponse(res, "Event updated successfully", event);
  } catch (error) {
    console.log("Error updating event:", error);
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to update event");
    }
    return errorResponse(res, "Failed to update event", error.message, 400);
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all images for this event first
    await EventImageRepository.deleteByEventId(id);

    const result = await eventService.deleteEvent(id);

    if (!result) {
      return notFoundResponse(res, "Event not found");
    }

    return successResponse(res, "Event deleted successfully", null);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to delete event");
    }
    return errorResponse(res, "Failed to delete event", error.message, 400);
  }
};

// Delete individual event image
const deleteEventImage = async (req, res) => {
  try {
    const { eventId, imageId } = req.params;

    // Verify the image belongs to the event
    const image = await EventImageRepository.findById(imageId);

    if (!image) {
      return notFoundResponse(res, "Image not found");
    }

    if (image.event_id != eventId) {
      return errorResponse(res, "Image does not belong to this event", null, 400);
    }

    // Delete the image
    const deleted = await EventImageRepository.delete(imageId);

    if (!deleted) {
      return errorResponse(res, "Failed to delete image", null, 500);
    }

    return successResponse(res, "Image deleted successfully", null);
  } catch (error) {
    if (error.message.includes("Service unavailable")) {
      return serviceUnavailableResponse(res, "Failed to delete image");
    }
    return errorResponse(res, "Failed to delete image", error.message, 400);
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventImage,
};
