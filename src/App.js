// src/App.jsx
import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const BUSINESS_DETAILS = {
  name: 'Lime Tree Bower',
  address: '395 Sailors Bay Road, Northbridge NSW 2063',
  abn: '52 639 712 922',
  email: 'shop@limetreebower.com'
};

function App() {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractOrderData = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');

      // Extract data using regex
      const orderNumber = text.match(/#(\d+)/)?.[1];
      const dateMatch = text.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
      const customerMatch = text.match(/Customer\s+(.*?)(?=\d+\s+orders)/s);
      const emailMatch = text.match(/Contact information\s+(.*?)(?=\+\d{2})/s);
      const itemMatch = text.match(/SKU:.*?\$(\d+\.\d{2})/s);
      const descriptionMatch = text.match(/(Lush & Moody.*?)(?=SKU)/s);
      const qtyMatch = text.match(/\$\d+\.\d{2} × (\d+)/);
      const totalMatch = text.match(/Total\s+\$(\d+\.\d{2})/);

      return {
        orderNumber,
        date: dateMatch?.[1],
        customerName: customerMatch?.[1]?.trim(),
        email: emailMatch?.[1]?.trim() || 'No email provided',
        description: descriptionMatch?.[1]?.trim(),
        quantity: qtyMatch?.[1] || '1',
        price: itemMatch?.[1],
        total: totalMatch?.[1]
      };
    } catch (err) {
      throw new Error('Failed to parse PDF: ' + err.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setError('');
    
    try {
      const extracted = await extractOrderData(file);
      setOrderData(extracted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add business details
    doc.setFontSize(20);
    doc.text('TAX INVOICE', 20, 20);
    
    doc.setFontSize(12);
    doc.text(BUSINESS_DETAILS.name, 20, 30);
    doc.text(BUSINESS_DETAILS.address, 20, 35);
    doc.text(`ABN ${BUSINESS_DETAILS.abn}`, 20, 40);
    doc.text(BUSINESS_DETAILS.email, 20, 45);
    
    // Add invoice details
    doc.text(`Date: ${orderData.date}`, 120, 30);
    doc.text(`Invoice #${orderData.orderNumber}`, 120, 35);
    
    // Add customer details
    doc.text('BILLED TO:', 20, 60);
    doc.text(orderData.customerName, 20, 65);
    doc.text(orderData.email, 20, 70);
    
    // Add items table
    doc.autoTable({
      startY: 80,
      head: [['Description', 'Qty', 'Price']],
      body: [
        [orderData.description, orderData.quantity, `$${orderData.price}`],
        ['', 'Total incl GST:', `$${orderData.total}`]
      ],
    });
    
    // Download the PDF
    doc.save(`invoice-${orderData.orderNumber}.pdf`);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-bold mb-4">Shopify Order to Tax Invoice</h1>
        
        {/* Upload Section */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center mb-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div>
              <span className="text-blue-600 hover:underline">Upload Shopify order PDF</span>
              {' '}or drag and drop
            </div>
          </label>
        </div>

        {/* Loading State */}
        {loading && <div className="text-center py-4">Processing PDF...</div>}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {/* Preview */}
        {orderData && (
          <div className="space-y-4">
            <div className="border rounded-lg p-6">
              <div className="flex justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">TAX INVOICE</h2>
                  <div className="space-y-1">
                    <p className="font-medium">{BUSINESS_DETAILS.name}</p>
                    <p>{BUSINESS_DETAILS.address}</p>
                    <p>ABN {BUSINESS_DETAILS.abn}</p>
                    <p>{BUSINESS_DETAILS.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p>{orderData.date}</p>
                  <p>Invoice #{orderData.orderNumber}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="font-medium">BILLED TO:</p>
                <p>{orderData.customerName}</p>
                <p>{orderData.email}</p>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">{orderData.description}</td>
                    <td className="py-2">{orderData.quantity}</td>
                    <td className="text-right py-2">${orderData.price}</td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan="2" className="py-2 font-medium">Total incl GST</td>
                    <td className="text-right py-2 font-medium">${orderData.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={generatePDF}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Download Tax Invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;