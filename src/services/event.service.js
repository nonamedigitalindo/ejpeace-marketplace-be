const EventRepository = require("../models/event.repository");
const { imageExists } = require("../middleware/image.middleware");
const Event = require("../models/Event.model");

const getAllEvents = async () => {
  try {
    const events = await EventRepository.findAll();

    // Filter events to only include those with valid image paths
    const validEvents = events.map((event) => {
      // Create a plain object from the Event instance
      const eventObj = event.toJSON();

      // If image path exists but file doesn't exist, remove the image path
      if (eventObj.image && !imageExists(eventObj.image)) {
        eventObj.image = null;
      }

      return eventObj;
    });

    return validEvents;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve events: " + error.message);
  }
};

const getEventById = async (id) => {
  try {
    const event = await EventRepository.findById(id);

    if (!event) {
      return null;
    }

    // Create a plain object from the Event instance
    const eventObj = event.toJSON();

    // If image path exists but file doesn't exist, remove the image path
    if (eventObj.image && !imageExists(eventObj.image)) {
      eventObj.image = null;
    }

    return eventObj;
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to retrieve event: " + error.message);
  }
};

const createEvent = async (eventData) => {
  try {
    // Validate that eventData exists
    if (!eventData) {
      throw new Error("Event data is required");
    }

    // Create event object
    const event = new Event(eventData);

    // Validate event data
    const validationErrors = event.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Save event to database
    const eventId = await EventRepository.create({
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      price: event.price,
      discount_percentage: event.discount_percentage,
      image: event.image, // Add image to the data sent to repository
    });

    // Return event data
    return {
      id: eventId,
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      price: event.price,
      discount_percentage: event.discount_percentage,
      image: event.image, // Include image in the response
      created_at: event.created_at,
    };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to create event: " + error.message);
  }
};

const updateEvent = async (id, eventData) => {
  try {
    // Validate that eventData exists
    if (!eventData) {
      throw new Error("Event data is required");
    }

    // Check if event exists
    const existingEvent = await EventRepository.findById(id);
    if (!existingEvent) {
      throw new Error("Event not found");
    }

    // Create event object for validation
    const event = new Event(eventData);

    // Validate event data
    const validationErrors = event.validate();
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // --- DELETE OLD IMAGE IF NEW IMAGE PROVIDED ---
    // Only verify and delete old image if a NEW image is being set
    if (
      eventData.image !== undefined &&
      eventData.image !== existingEvent.image
    ) {
      try {
        const fs = require("fs");
        const path = require("path");

        const oldImage = existingEvent.image;
        if (oldImage) {
          // Extract filename from URL
          const filename = oldImage.split("/").pop();
          if (filename) {
            const filePath = path.join(__dirname, "../../uploads", filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[EventService] Deleted old image: ${filePath}`);
            }
          }
        }
      } catch (err) {
        console.error("[EventService] Error deleting old image:", err);
      }
    }
    // ------------------------------------------------

    const updatePayload = {
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      price: event.price,
      discount_percentage: event.discount_percentage,
    };

    // Only update image if it's provided in the input
    if (eventData.image !== undefined) {
      updatePayload.image = event.image;
    }

    // Update event
    const updated = await EventRepository.update(id, updatePayload);
    if (!updated) {
      throw new Error("Failed to update event");
    }

    // Return updated event
    const updatedEvent = await EventRepository.findById(id);
    return updatedEvent.toJSON();
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to update event: " + error.message);
  }
};

const deleteEvent = async (id) => {
  try {
    // Check if event exists
    const existingEvent = await EventRepository.findById(id);
    if (!existingEvent) {
      throw new Error("Event not found");
    }

    // Soft delete event
    const deleted = await EventRepository.softDelete(id);
    if (!deleted) {
      throw new Error("Failed to delete event");
    }

    return { message: "Event deleted successfully" };
  } catch (error) {
    if (error.message === "Database connection failed") {
      throw new Error("Service unavailable. Please try again later.");
    }
    throw new Error("Failed to delete event: " + error.message);
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
