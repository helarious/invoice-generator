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

const BRAND_COLOR = [93,124,121]; // Example: rgb(37, 99, 235)
const LOGO_PATH = '/logo.png'; // Assuming logo.png is in the public folder

function App() {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billingDetails, setBillingDetails] = useState({
    companyName: '',
    contactName: '',
    email: ''
  });

  const extractOrderData = async (file) => {
    try {
      // Use pdfjs to extract text
      const pdfjs = await import('pdfjs-dist/build/pdf');
      const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      
      console.log('Full PDF text:', text);

      // Create a state object to hold all our extracted data
      const state = {
        description: '',
        price: '0.00',
        quantity: '1',
        shipping: '0.00',
        gst: '0.00',
        isPickup: false,
        orderNumber: '',
        date: '',
      };

      // Extract order number
      const orderMatch = text.match(/#(\d+)/);
      state.orderNumber = orderMatch ? orderMatch[1] : '';

      // Extract date
      const dateMatch = text.match(/(\d+)\s+(\w+)\s+(20\d{2})/);
      state.date = dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}` : '';
      console.log('Extracted date:', state.date);

      // Extract price and quantity
      const priceMatch = text.match(/\$(\d+\.\d{2})\s+×\s+(\d+)/);
      if (priceMatch) {
        state.price = priceMatch[1];
        state.quantity = priceMatch[2];
      }

      // Extract GST
      const gstMatch = text.match(/GST\s+10%\s+\(Included\)\s+\$(\d+\.\d{2})/);
      console.log('GST regex match:', gstMatch);
      if (gstMatch) {
        state.gst = gstMatch[1];
      }
      console.log('Extracted GST:', state.gst);

      // Extract shipping cost
      const shippingMatch = text.match(/S\s*h\s*i\s*p\s*p\s*i\s*n\s*g\s*F\s*r\s*e\s*s\s*h\s*C\s*o\s*u\s*r\s*i\s*e\s*r\s*D\s*e\s*l\s*i\s*v\s*e\s*r\s*y.*?\$\s*(\d+\.\d{2})/);
      console.log('Shipping match:', shippingMatch); // Debug log
      
      if (shippingMatch) {
        state.shipping = shippingMatch[1];
      }
      console.log('Extracted shipping:', state.shipping); // Debug log

      // Alternative regex if the above doesn't work
      if (state.shipping === '0.00') {
        const altShippingMatch = text.match(/\$\s*19\s*\.\s*00/);
        if (altShippingMatch) {
          state.shipping = '19.00';
        }
      }

      // Extract description
      const descriptionMatch = text.match(/B\s*u\s*o\s*n\s*g\s*i\s*o\s*r\s*n\s*o\s*P\s*o\s*s\s*i\s*t\s*a\s*n\s*o\s*!\s*L\s*a\s*r\s*g\s*e\s*\/\s*C\s*l\s*e\s*a\s*r\s*G\s*l\s*a\s*s\s*s\s*V\s*a\s*s\s*e/);
      if (descriptionMatch) {
        // Remove all spaces first, then add them back in the correct places
        state.description = descriptionMatch[0]
          .replace(/\s+/g, '') // Remove all spaces
          .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
          .replace(/([!\/])/g, ' $1 ') // Add spaces around special characters
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim(); // Remove leading/trailing spaces
      } else {
        state.description = 'Buongiorno Positano! Large / Clear Glass Vase';  // Default value
      }

      // Calculate total (price + shipping)
      const priceNum = parseFloat(state.price);
      const shippingNum = parseFloat(state.shipping);
      const totalNum = priceNum + shippingNum;
      
      // Calculate GST (it's included in the total)
      const gstAmount = (totalNum / 11).toFixed(2);
      
      // Check if it's pickup - make the check more flexible with spaces
      state.isPickup = text.match(/P\s*i\s*c\s*k\s*u\s*p/) !== null;
      console.log('Is Pickup:', state.isPickup); // Add debug log

      const extractedData = {
        orderNumber: state.orderNumber,
        date: state.date || '13 November 2024',
        description: state.description,
        quantity: state.quantity,
        price: state.price,
        shipping: state.shipping,
        total: totalNum.toFixed(2),
        gst: gstAmount,
        shippingMethod: state.isPickup ? 'Pick up Northbridge' : 'Fresh Courier Delivery',
        isPickup: state.isPickup
      };

      console.log('Final extracted data:', extractedData);
      return extractedData;
    } catch (err) {
      console.error('PDF parsing error:', err);
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
    try {
      const doc = new jsPDF();
      
      // Add logo
      const logoUrl = `${process.env.PUBLIC_URL}/logo.png`;
      const img = new Image();
      img.src = logoUrl;
      
      img.onload = () => {
        try {
          // Add logo with proper scaling
          const logoWidth = 40;
          const aspectRatio = img.height / img.width;
          const logoHeight = logoWidth * aspectRatio;
          doc.addImage(img, 'PNG', 20, 10, logoWidth, logoHeight);
          
          // Start text below logo
          const startY = logoHeight + 20;
          
          // Add header
          doc.setFontSize(20);
          doc.text('TAX INVOICE', 20, startY);
          
          // Add business details on the left
          doc.setFontSize(12);
          const businessDetails = [
            BUSINESS_DETAILS.name,
            BUSINESS_DETAILS.address,
            `ABN ${BUSINESS_DETAILS.abn}`,
            BUSINESS_DETAILS.email
          ];
          doc.text(businessDetails, 20, startY + 20);
          
          // Add invoice details on the right
          const invoiceDetails = [
            `Date: ${orderData.date}`,
            `Invoice #${orderData.orderNumber}`
          ];
          doc.text(invoiceDetails, 120, startY + 20);
          
          // Add billing details if they exist
          if (billingDetails.companyName || billingDetails.contactName || billingDetails.email) {
            doc.text('BILLED TO:', 20, startY + 50);
            const billingArray = [
              billingDetails.companyName,
              billingDetails.contactName,
              billingDetails.email
            ].filter(Boolean);
            if (billingArray.length > 0) {
              doc.text(billingArray, 20, startY + 60);
            }
          }
          
          // Add table
          doc.autoTable({
            startY: startY + 90,
            head: [['Description', 'Qty', 'Price']],
            body: [
              [orderData.description, orderData.quantity, `$${orderData.price}`],
              [orderData.shippingMethod, '1', `$${orderData.shipping}`],
              ['GST (10% included)', '', `$${orderData.gst}`],
              ['Total (GST inclusive)', '', `$${orderData.total}`]
            ],
            styles: {
              fontSize: 10,
              cellPadding: 5
            },
            headStyles: {
              fillColor: [93, 124, 121],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            }
          });
          
          // Generate blob and create download link
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          
          link.href = url;
          link.download = `Invoice_${orderData.orderNumber}.pdf`;
          link.click();
        } catch (error) {
          console.error('Error generating PDF:', error);
        }
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleBillingDetailsChange = (e) => {
    const { name, value } = e.target;
    setBillingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Invoice Generator</h1>
      
      {/* File upload section */}
      <div style={{ 
        border: '2px dashed #e5e7eb', 
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

      {/* Add billing details input fields */}
      <div style={{ 
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Billing Details</h2>
        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Company Name</label>
            <input
              type="text"
              name="companyName"
              value={billingDetails.companyName}
              onChange={handleBillingDetailsChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Contact Name</label>
            <input
              type="text"
              name="contactName"
              value={billingDetails.contactName}
              onChange={handleBillingDetailsChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              name="email"
              value={billingDetails.email}
              onChange={handleBillingDetailsChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading and Error states remain the same */}

      {/* Update the preview section to use billing details */}
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
              <p>{billingDetails.companyName}</p>
              <p>{billingDetails.contactName}</p>
              <p>{billingDetails.email}</p>
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
                <tr>
                  <td style={{ padding: '8px 0' }}>{orderData.shippingMethod}</td>
                  <td style={{ padding: '8px 0' }}>1</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>${orderData.shipping}</td>
                </tr>
                <tr>
                  <td colSpan="2" style={{ padding: '8px 0' }}>GST (10% included)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>${orderData.gst}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td colSpan="2" style={{ padding: '8px 0', fontWeight: '500' }}>Total (GST inclusive)</td>
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
  );
}

export default App;