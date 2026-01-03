const ExcelJS = require('exceljs');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class ExportService {

  /**
   * Export data to Excel
   */
  async exportToExcel(data, columns, sheetName = 'Sheet1') {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Add headers
      worksheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
      }));

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data
      data.forEach(item => {
        worksheet.addRow(item);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Export to Excel error:', error);
      throw error;
    }
  }

  /**
   * Export data to CSV
   */
  async exportToCSV(data, columns, filename) {
    try {
      const filepath = path.join(__dirname, '../../exports', filename);

      // Ensure exports directory exists
      await fs.mkdir(path.join(__dirname, '../../exports'), { recursive: true });

      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: columns.map(col => ({
          id: col.key,
          title: col.header
        }))
      });

      await csvWriter.writeRecords(data);

      return filepath;
    } catch (error) {
      logger.error('Export to CSV error:', error);
      throw error;
    }
  }

  /**
   * Export products
   */
  async exportProducts(products) {
    const columns = [
      { header: 'Product ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Stock', key: 'stockQuantity', width: 12 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    const data = products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      price: product.price,
      stockQuantity: product.stockQuantity,
      category: product.category?.name || '',
      status: product.isActive ? 'Active' : 'Inactive',
      createdAt: new Date(product.createdAt).toLocaleString()
    }));

    return this.exportToExcel(data, columns, 'Products');
  }

  /**
   * Export orders
   */
  async exportOrders(orders) {
    const columns = [
      { header: 'Order Number', key: 'orderNumber', width: 20 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Customer Email', key: 'customerEmail', width: 30 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 20 }
    ];

    const data = orders.map(order => ({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || '',
      customerEmail: order.user?.email || '',
      totalAmount: order.finalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      orderDate: new Date(order.createdAt).toLocaleString()
    }));

    return this.exportToExcel(data, columns, 'Orders');
  }

  /**
   * Export users
   */
  async exportUsers(users) {
    const columns = [
      { header: 'User ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Registered On', key: 'registeredOn', width: 20 }
    ];

    const data = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.isActive ? 'Active' : 'Inactive',
      registeredOn: new Date(user.createdAt).toLocaleString()
    }));

    return this.exportToExcel(data, columns, 'Users');
  }
}

module.exports = new ExportService();