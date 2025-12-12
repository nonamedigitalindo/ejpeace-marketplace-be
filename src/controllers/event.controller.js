const eventService = require("../services/event.service");
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

    // Prepare event data
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

    // If files were uploaded, add the file paths to event data
    if (imageFiles.length > 0) {
      // For events, we'll store the first image as the main image
      // (Events typically have one main image, but we support multiple for flexibility)
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://212.85.27.163"
          : `http://localhost:${process.env.PORT || 3000}`;
      const imageUrl = `${baseUrl}/api/v1/uploads/${imageFiles[0].filename}`;
      eventData.image = imageUrl;
      console.log("Event image URL set:", imageUrl);
    } else {
      console.log("No files uploaded");
    }

    const event = await eventService.createEvent(eventData);

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

    // Prepare update data
    const updateData = { ...req.body };

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

    // If files were uploaded, add the file path to update data
    if (imageFiles.length > 0) {
      // For events, we'll store the first image as the main image
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://212.85.27.163"
          : `http://localhost:${process.env.PORT || 3000}`;
      const imageUrl = `${baseUrl}/api/v1/uploads/${imageFiles[0].filename}`;
      updateData.image = imageUrl;
      console.log("Event image URL set:", imageUrl);
    } else {
      console.log("No files uploaded");
    }

    const event = await eventService.updateEvent(id, updateData);

    if (!event) {
      return notFoundResponse(res, "Event not found");
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

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
