// src/App.js
import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './App.css';  // Make sure this file exists

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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Shopify Order to Tax Invoice</h1>
        
        {/* Upload Section */}
        <div style={{ 
          border: '2px dashed #ccc', 
          borderRadius: '8px', 
          padding: '20px', 
          textAlign: 'center',
          marginBottom: '20px',
          cursor: 'pointer'
        }}>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <span style={{ color: '#2563eb', textDecoration: 'underline' }}>Upload Shopify order PDF</span>
            {' '}or drag and drop
          </label>
        </div>

        {/* Loading State */}
        {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Processing PDF...</div>}

        {/* Error Message */}
        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            padding: '16px', 
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {orderData && (
          <div>
            <div style={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>TAX INVOICE</h2>
                  <div>
                    <p style={{ fontWeight: '500' }}>{BUSINESS_DETAILS.name}</p>
                    <p>{BUSINESS_DETAILS.address}</p>
                    <p>ABN {BUSINESS_DETAILS.abn}</p>
                    <p>{BUSINESS_DETAILS.email}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p>{orderData.date}</p>
                  <p>Invoice #{orderData.orderNumber}</p>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontWeight: '500' }}>BILLED TO:</p>
                <p>{orderData.customerName}</p>
                <p>{orderData.email}</p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 0' }}>{orderData.description}</td>
                    <td style={{ padding: '8px 0' }}>{orderData.quantity}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>${orderData.price}</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td colSpan="2" style={{ padding: '8px 0', fontWeight: '500' }}>Total incl GST</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '500' }}>${orderData.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={generatePDF}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer'
              }}
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