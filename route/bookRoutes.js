import express from 'express';
import mongoose from 'mongoose';
import Book from '../models/BookModel.js';
import Author from '../models/AuthorModel.js';
import Log from '../models/LogModel.js';

const router = express.Router();

// 1. Create explicit collection "books" with validation
router.post('/collection/books', async (req, res) => {
  try {
    await mongoose.connection.createCollection('books', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['title'],
          properties: {
            title: {
              bsonType: 'string',
              description: 'must be a string and is required and non-empty'
            }
          }
        }
      }
    });
    res.status(200).json({ ok: 1 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Create implicit collection "authors" by inserting data
router.post('/collection/authors', async (req, res) => {
  try {
    const author = new Author({ name: "Author1", nationality: "British" });
    await author.save();
    res.status(201).json({ acknowledged: true, insertedId: author._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 3. Create capped collection "logs" (size limit 1MB)
router.post('/collection/logs/capped', async (req, res) => {
  try {
    await mongoose.connection.createCollection('logs', {
      capped: true,
      size: 1048576 
    });
    res.status(200).json({ ok: 1 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Create an index on books collection for the title field
router.post('/collection/books/index', async (req, res) => {
  try {
    await Book.collection.createIndex({ title: 1 });
    res.status(200).send("title_1");
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 5. Insert one document into books
router.post('/books', async (req, res) => {
  try {
    const book = new Book({
      title: "Booki",
      author: "Ali",
      year: 1937,
      genres: ["Fantasy", "Adventure"]
    });
    await book.save();
    res.status(201).json({ acknowledged: true, insertedId: book._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 6. Insert multiple documents (batch)
router.post('/books/batch', async (req, res) => {
  try {
    const books = [
      { title: "Future", author: "George Orwell", year: 2020, genres: ["Science Fiction"] },
      { title: "To Kill Mockingbird", author: "Harper Lee", year: 1960, genres: ["Classic", "Fiction"] },
      { title: "Brave New World", author: "Aldous Huxley", year: 2006, genres: ["Dystopian", "Science Fiction"] }
    ];
    const insertedBooks = await Book.insertMany(books);
    const insertedIds = {};
    insertedBooks.forEach((b, index) => {
      insertedIds[index] = b._id;
    });
    res.status(201).json({ acknowledged: true, insertedIds });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 7. Insert a new log
router.post('/logs', async (req, res) => {
  try {
    const log = new Log({
      book_id: new mongoose.Types.ObjectId("64b5c2d8a123456ef8914"),
      action: "borrowed"
    });
    await log.save();
    res.status(201).json({ acknowledged: true, insertedId: log._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 8. Update book title "Future" year to 2022
router.patch('/books/Future', async (req, res) => {
  try {
    const result = await Book.updateOne({ title: "Future" }, { $set: { year: 2022 } });
    res.status(200).json({
      acknowledged: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 9. Find a Book with title
router.get('/books/title', async (req, res) => {
  try {
    const titleQuery = req.query.title;
    const book = await Book.findOne({ title: titleQuery });
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 10. Find all books published between 1990 and 2010
router.get('/books/year', async (req, res) => {
  try {
    const { from, to } = req.query;
    const books = await Book.find({ year: { $gte: Number(from), $lte: Number(to) } });
    res.status(200).json(books);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 11. Find books where genre includes "Science Fiction"
router.get('/books/genre', async (req, res) => {
  try {
    const genreQuery = req.query.genre;
    const books = await Book.find({ genres: genreQuery });
    res.status(200).json(books);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 12. Skip first 2, limit next 3, sorted by year descending
router.get('/books/skip-limit', async (req, res) => {
  try {
    const books = await Book.find().sort({ year: -1 }).skip(2).limit(3);
    res.status(200).json(books);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 13. Find books where year is stored as integer
router.get('/books/year-integer', async (req, res) => {
  try {
    const books = await Book.find({ year: { $type: "int" } });
    res.status(200).json(books);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 14. Exclude genres "Horror" or "Science Fiction"
router.get('/books/exclude-genres', async (req, res) => {
  try {
    const books = await Book.find({ genres: { $nin: ["Horror", "Science Fiction"] } });
    res.status(200).json(books);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 15. Delete books before year 2000
router.delete('/books/before-year', async (req, res) => {
  try {
    const yearLimit = Number(req.query.year) || 2000;
    const result = await Book.deleteMany({ year: { $lt: yearLimit } });
    res.status(200).json({ acknowledged: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 16. Aggregation 1: Filter after 2000 and sort descending
router.get('/books/aggregate1', async (req, res) => {
  try {
    const result = await Book.aggregate([
      { $match: { year: { $gt: 2000 } } },
      { $sort: { year: -1 } }
    ]);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 17. Aggregation 2: Project only title, author, year
router.get('/books/aggregate2', async (req, res) => {
  try {
    const result = await Book.aggregate([
      { $match: { year: { $gt: 2000 } } },
      { $project: { title: 1, author: 1, year: 1, _id: 0 } }
    ]);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 18. Aggregation 3: Unwind genres array
router.get('/books/aggregate3', async (req, res) => {
  try {
    const result = await Book.aggregate([
      { $unwind: "$genres" },
      { $project: { title: 1, genres: 1, _id: 0 } }
    ]);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 19. Aggregation 4: Join books with logs
router.get('/books/aggregate4', async (req, res) => {
  try {
    const result = await Log.aggregate([
      {
        $lookup: {
          from: "books",
          localField: "book_id",
          foreignField: "_id",
          as: "book_details"
        }
      },
      {
        $project: {
          action: 1,
          book_details: { title: 1, author: 1, year: 1 }
        }
      }
    ]);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;