import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  action: { type: String, required: true }
}, { capped: { size: 1048576, max: 1000 } }); // حجم 1MB

const Log = mongoose.model('Log', logSchema);
export default Log;