const db = require("../config/db.config");
const EventImage = require("./EventImage.model");

class EventImageRepository {
    // Create a new event image
    static async create(imageData) {
        const { event_id, image_url, position } = imageData;
        const createdAt = new Date();

        const query = `
      INSERT INTO event_images (event_id, image_url, position, created_at)
      VALUES (?, ?, ?, ?)
    `;

        try {
            const [result] = await db.execute(query, [
                event_id,
                image_url,
                position || 0,
                createdAt,
            ]);
            return result.insertId;
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                throw new Error("Database connection failed");
            }
            throw error;
        }
    }

    // Create multiple event images at once
    static async createMany(eventId, images) {
        if (!images || images.length === 0) return [];

        const createdAt = new Date();
        const insertIds = [];

        for (let i = 0; i < images.length; i++) {
            const query = `
        INSERT INTO event_images (event_id, image_url, position, created_at)
        VALUES (?, ?, ?, ?)
      `;

            try {
                const [result] = await db.execute(query, [
                    eventId,
                    images[i].image_url,
                    images[i].position !== undefined ? images[i].position : i,
                    createdAt,
                ]);
                insertIds.push(result.insertId);
            } catch (error) {
                if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                    throw new Error("Database connection failed");
                }
                throw error;
            }
        }

        return insertIds;
    }

    // Find all images by event ID
    static async findByEventId(eventId) {
        const query = `
      SELECT id, event_id, image_url, position, created_at
      FROM event_images
      WHERE event_id = ?
      ORDER BY position ASC
    `;

        try {
            const [rows] = await db.execute(query, [eventId]);
            return rows.map((row) => new EventImage(row));
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                console.error("Database connection failed while fetching event images");
                return [];
            }
            throw error;
        }
    }

    // Find image by URL pattern (for deletion by URL instead of ID)
    static async findByUrlPattern(eventId, urlPattern) {
        const query = `
      SELECT id, event_id, image_url, position, created_at
      FROM event_images
      WHERE event_id = ? AND image_url LIKE ?
    `;

        try {
            // Extract filename from the URL pattern and use it for LIKE search
            const filename = urlPattern.split("/").pop();
            const [rows] = await db.execute(query, [eventId, `%${filename}`]);
            if (rows.length === 0) return null;
            return new EventImage(rows[0]);
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                return null;
            }
            throw error;
        }
    }

    // Find image by ID
    static async findById(id) {
        const query = `
      SELECT id, event_id, image_url, position, created_at
      FROM event_images
      WHERE id = ?
    `;

        try {
            const [rows] = await db.execute(query, [id]);
            if (rows.length === 0) return null;
            return new EventImage(rows[0]);
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                return null;
            }
            throw error;
        }
    }

    // Update image position
    static async updatePosition(id, position) {
        const query = `
      UPDATE event_images
      SET position = ?
      WHERE id = ?
    `;

        try {
            const [result] = await db.execute(query, [position, id]);
            return result.affectedRows > 0;
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                return false;
            }
            throw error;
        }
    }

    // Delete image by ID
    static async delete(id) {
        const query = `
      DELETE FROM event_images
      WHERE id = ?
    `;

        try {
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                return false;
            }
            throw error;
        }
    }

    // Delete all images by event ID
    static async deleteByEventId(eventId) {
        const query = `
      DELETE FROM event_images
      WHERE event_id = ?
    `;

        try {
            const [result] = await db.execute(query, [eventId]);
            return result.affectedRows;
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                return 0;
            }
            throw error;
        }
    }

    // Get next position for event
    static async getNextPosition(eventId) {
        const query = `
      SELECT MAX(position) as maxPosition
      FROM event_images
      WHERE event_id = ?
    `;

        try {
            const [rows] = await db.execute(query, [eventId]);
            const maxPosition = rows[0]?.maxPosition;
            return maxPosition !== null ? maxPosition + 1 : 0;
        } catch (error) {
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
                return 0;
            }
            throw error;
        }
    }
}

module.exports = EventImageRepository;
