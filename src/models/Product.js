export class Product {
  constructor(id, name, description, price, quantity, category, imageUrl, sku) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.quantity = quantity;
    this.category = category;
    this.imageUrl = imageUrl;
    this.sku = sku;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Product(
      doc.id,
      data.name,
      data.description,
      data.price,
      data.quantity,
      data.category,
      data.imageUrl,
      data.sku
    );
  }

  toFirestore() {
    return {
      name: this.name,
      description: this.description,
      price: this.price,
      quantity: this.quantity,
      category: this.category,
      imageUrl: this.imageUrl,
      sku: this.sku,
      updatedAt: new Date()
    };
  }
}