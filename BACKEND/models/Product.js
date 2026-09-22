const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String, default: 'lanche' },
  image: { type: String }
});

module.exports = mongoose.model('Product', productSchema);