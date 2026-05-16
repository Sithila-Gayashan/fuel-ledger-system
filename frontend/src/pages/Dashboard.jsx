import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import '../App.css';



const Dashboard = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [editId, setEditId] = useState(null);
    const [settings, setSettings] = useState({ fuelTypes: [] });
    
    // Cash Collections - like card invoices
    const [cashCollections, setCashCollections] = useState([]);
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashInput, setCashInput] = useState({ 
        time: '', 
        amount: '', 
        receivedBy: '' 
    });
    
    const [formData, setFormData] = useState({
        employee: '', 
        fuelType: 'Petrol 92', 
        pumpNozzle: 'Nozzle 01',
        startReading: '', 
        endReading: '', 
        isRollover: false,
        unitPrice: '370', 
        vouchers: ''
    });

    const [cardInvoices, setCardInvoices] = useState([]);
    const [showCardModal, setShowCardModal] = useState(false);
    const [invoiceInput, setInvoiceInput] = useState({ invoiceNo: '', amount: '' });
    const [calc, setCalc] = useState({ liters: 0, sales: 0, shortage: 0, totalCard: 0, totalCash: 0 });
    const [availableNozzles, setAvailableNozzles] = useState(['Nozzle 01']);

    // Calculate total cash from collections
    const calculateTotalCash = () => {
        return cashCollections.reduce((sum, collection) => sum + Number(collection.amount), 0);
    };

    // Add cash collection
    const handleAddCashCollection = () => {
        if (!cashInput.amount) return alert("Please enter amount!");
        const now = new Date();
        const timeStr = cashInput.time || now.toLocaleTimeString();
        
        setCashCollections([
            ...cashCollections, 
            { 
                id: Date.now(),
                time: timeStr, 
                amount: Number(cashInput.amount),
                receivedBy: cashInput.receivedBy || 'Cashier'
            }
        ]);
        setCashInput({ time: '', amount: '', receivedBy: '' });
    };

    const removeCashCollection = (index) => {
        const newList = [...cashCollections];
        newList.splice(index, 1);
        setCashCollections(newList);
    };

    // Update total cash in formData when collections change
    useEffect(() => {
        const totalCash = calculateTotalCash();
        setFormData(prev => ({ ...prev, cash: totalCash.toString() }));
        setCalc(prev => ({ ...prev, totalCash }));
    }, [cashCollections]);

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            navigate('/');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        navigate('/');
    };

    const fetchData = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/fuel/all');
            setEntries(res.data);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/settings');
            if (res.data && res.data.fuelTypes) {
                setSettings(res.data);
                const defaultFuel = res.data.fuelTypes.find(f => f.name === 'Petrol 92');
                if (defaultFuel) {
                    setAvailableNozzles(defaultFuel.nozzles || ['Nozzle 01']);
                    setFormData(prev => ({ ...prev, unitPrice: defaultFuel.unitPrice?.toString() || '370' }));
                }
            }
        } catch (err) {
            console.log("Error fetching settings:", err);
            setSettings({
                fuelTypes: [
                    { name: 'Petrol 92', nozzles: ['Nozzle 01', 'Nozzle 02'], unitPrice: 370 },
                    { name: 'Petrol 95', nozzles: ['Nozzle 03', 'Nozzle 04'], unitPrice: 400 },
                    { name: 'Diesel', nozzles: ['Nozzle 05', 'Nozzle 06'], unitPrice: 360 },
                    { name: 'Super Diesel', nozzles: ['Nozzle 07', 'Nozzle 08'], unitPrice: 390 }
                ]
            });
        }
    };

    const fetchLastReading = async (type, nozzle) => {
        if (editId || !type || !nozzle) return; 
        try {
            const res = await axios.get(`http://localhost:5000/api/fuel/last-reading/${type}/${nozzle}`);
            setFormData(prev => ({ ...prev, startReading: res.data.lastReading?.toString() || '' }));
        } catch (err) { 
            console.log("Error fetching reading:", err); 
        }
    };

    useEffect(() => { 
        fetchData();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings.fuelTypes?.length > 0 && formData.fuelType && formData.pumpNozzle && !editId) {
            fetchLastReading(formData.fuelType, formData.pumpNozzle);
        }
    }, [settings, formData.fuelType, formData.pumpNozzle]);

    useEffect(() => {
        let liters = 0;
        const start = Number(formData.startReading) || 0;
        const end = Number(formData.endReading) || 0;

        if (formData.isRollover) {
            const METER_MAX = 1000000;
            liters = (METER_MAX - start) + end;
        } else {
            liters = end - start;
        }

        const sales = liters * (Number(formData.unitPrice) || 0);
        const totalCard = cardInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalCash = calculateTotalCash();
        const payments = totalCash + totalCard + (Number(formData.vouchers) || 0);
        const shortage = payments - sales;

        setCalc({ liters, sales, shortage, totalCard, totalCash });
    }, [formData, cardInvoices, cashCollections]);

    const handleFuelTypeChange = (e) => {
        const selectedFuelName = e.target.value;
        const selectedConfig = settings.fuelTypes?.find(f => f.name === selectedFuelName);
        const nozzles = selectedConfig ? selectedConfig.nozzles : ['Nozzle 01'];

        const firstNozzle = nozzles[0] || "";
        setAvailableNozzles(nozzles);
        setFormData(prev => ({ ...prev, fuelType: selectedFuelName, pumpNozzle: firstNozzle, startReading: '' }));

        if (selectedFuelName && firstNozzle) {
            fetchLastReading(selectedFuelName, firstNozzle);
        }
    };

    const handleNozzleChange = (e) => {
        const nozzle = e.target.value;
        setFormData(prev => ({ ...prev, pumpNozzle: nozzle, startReading: '' }));

        if (formData.fuelType && nozzle) {
            fetchLastReading(formData.fuelType, nozzle);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleAddCardInvoice = () => {
        if (!invoiceInput.invoiceNo || !invoiceInput.amount) return alert("Please fill both!");
        const isExist = cardInvoices.find(inv => inv.invoiceNo === invoiceInput.invoiceNo);
        if (isExist) return alert("This invoice is already added!");
        setCardInvoices([...cardInvoices, invoiceInput]);
        setInvoiceInput({ invoiceNo: '', amount: '' });
    };

    const removeCardInvoice = (index) => {
        const newList = [...cardInvoices];
        newList.splice(index, 1);
        setCardInvoices(newList);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = { 
                ...formData, 
                cardInvoices,
                cashCollections  // Add cash collections to submission
            };
            
            if (editId) {
                await axios.put(`http://localhost:5000/api/fuel/update/${editId}`, dataToSubmit);
                alert("Record Updated Successfully!");
                setEditId(null);
            } else {
                await axios.post('http://localhost:5000/api/fuel/add', dataToSubmit);
                alert("Record Saved Successfully!");
            }
            
            setFormData(prev => ({ 
                ...prev, 
                employee: '', 
                endReading: '', 
                vouchers: '', 
                isRollover: false,
                startReading: editId ? '' : prev.endReading
            }));
            setCashCollections([]);
            setCardInvoices([]);
            fetchData();
            
            if (!editId) {
                fetchLastReading(formData.fuelType, formData.pumpNozzle);
            }
        } catch (err) {
            alert("Error: " + (err.response?.data?.error || err.message));
        }
    };

    const handleEdit = (entry) => {
        setFormData({
            employee: entry.employee,
            fuelType: entry.fuelType,
            pumpNozzle: entry.pumpNozzle || 'Nozzle 01',
            startReading: entry.startReading,
            endReading: entry.endReading,
            isRollover: entry.isRollover || false,
            unitPrice: entry.unitPrice,
            vouchers: entry.vouchers || ''
        });
        setCardInvoices(entry.cardInvoices || []);
        setCashCollections(entry.cashCollections || []);
        setEditId(entry._id);
        
        const fuelConfig = settings.fuelTypes?.find(f => f.name === entry.fuelType);
        if (fuelConfig) {
            setAvailableNozzles(fuelConfig.nozzles || ['Nozzle 01']);
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this record?")) {
            try {
                await axios.delete(`http://localhost:5000/api/fuel/delete/${id}`);
                fetchData();
            } catch (err) {
                alert("Delete Failed: " + err.message);
            }
        }
    };

    const generatePDF = () => {
    try {
        // Create new PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.setTextColor(0, 255, 136);
        doc.text("Daily Fuel Sales & Payments Report", 14, 20);
        
        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        
        // Calculate totals
        let totalLiters = 0;
        let totalSales = 0;
        let totalShortage = 0;
        
        entries.forEach(entry => {
            let liters = entry.isRollover 
                ? (1000000 - entry.startReading + entry.endReading) 
                : (entry.endReading - entry.startReading);
            totalLiters += liters;
            totalSales += entry.totalSales || 0;
            totalShortage += entry.shortage || 0;
        });
        
        // Summary box
        doc.setFillColor(0, 255, 136);
        doc.rect(14, 38, 180, 20, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Summary: Total Liters: ${totalLiters.toFixed(2)}L | Total Sales: Rs. ${totalSales.toFixed(2)} | Shortage: Rs. ${totalShortage.toFixed(2)}`, 18, 50);
        
        // Prepare table data
        const tableColumn = ["Date", "Employee", "Fuel Type", "Nozzle", "Liters", "Total (Rs)", "Shortage"];
        const tableRows = [];
        
        entries.forEach(entry => {
            const liters = entry.isRollover 
                ? (1000000 - entry.startReading + entry.endReading) 
                : (entry.endReading - entry.startReading);
            
            tableRows.push([
                new Date(entry.date).toLocaleDateString(),
                entry.employee,
                entry.fuelType,
                entry.pumpNozzle || '-',
                liters.toFixed(2),
                `Rs. ${(entry.totalSales || 0).toFixed(2)}`,
                `Rs. ${(entry.shortage || 0).toFixed(2)}`
            ]);
        });
        
        // Draw table manually (since autoTable might not work)
        let startY = 70;
        const cellHeight = 10;
        const colWidths = [30, 25, 30, 25, 25, 35, 35];
        
        // Draw header
        doc.setFillColor(0, 255, 136);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        
        let currentX = 14;
        tableColumn.forEach((col, i) => {
            doc.rect(currentX, startY, colWidths[i], cellHeight, 'F');
            doc.text(col, currentX + 2, startY + 7);
            currentX += colWidths[i];
        });
        
        // Draw rows
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        let currentY = startY + cellHeight;
        
        for (let i = 0; i < tableRows.length; i++) {
            // Check if we need a new page
            if (currentY + cellHeight > 280) {
                doc.addPage();
                currentY = 20;
                
                // Redraw header on new page
                currentX = 14;
                doc.setFillColor(0, 255, 136);
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'bold');
                tableColumn.forEach((col, j) => {
                    doc.rect(currentX, currentY, colWidths[j], cellHeight, 'F');
                    doc.text(col, currentX + 2, currentY + 7);
                    currentX += colWidths[j];
                });
                currentY += cellHeight;
                doc.setFont(undefined, 'normal');
            }
            
            currentX = 14;
            const row = tableRows[i];
            
            // Alternate row colors
            if (i % 2 === 0) {
                doc.setFillColor(245, 245, 245);
            } else {
                doc.setFillColor(255, 255, 255);
            }
            
            for (let j = 0; j < row.length; j++) {
                doc.rect(currentX, currentY, colWidths[j], cellHeight, 
                    i % 2 === 0 ? 'F' : undefined);
                doc.text(String(row[j]), currentX + 2, currentY + 7);
                currentX += colWidths[j];
            }
            currentY += cellHeight;
        }
        
        // Save PDF
        doc.save("Daily_Fuel_Report.pdf");
        alert("PDF Downloaded Successfully!");
        
    } catch (err) {
        console.error("PDF Error:", err);
        alert("Error generating PDF: " + err.message + "\n\nTry refreshing the page and try again.");
    }
};

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>⛽ Real-time Fuel Ledger</h2>
                <div className="dashboard-header-buttons">
                    <button onClick={generatePDF} className="dashboard-button">
                        📄 Download PDF
                    </button>
                    <button onClick={handleLogout} className="dashboard-button dashboard-button-danger">
                        🚪 Logout
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="dashboard-card" style={{ border: editId ? '2px solid #ff9900' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                {editId && <h3 style={{ color: '#ff9900', marginBottom: '15px' }}>✏️ Edit Mode (Updating Record)</h3>}
                
                <div className="form-grid">
                    <input 
                        type="text" 
                        name="employee" 
                        placeholder="Employee Name" 
                        value={formData.employee} 
                        onChange={handleChange} 
                        className="dashboard-input" 
                        required 
                    />
                    
                    <select 
                        name="fuelType" 
                        value={formData.fuelType} 
                        onChange={handleFuelTypeChange} 
                        className="dashboard-input"
                    >
                        {settings.fuelTypes?.map(fuel => (
                            <option key={fuel.name} value={fuel.name}>{fuel.name}</option>
                        ))}
                    </select>

                    <select 
                        name="pumpNozzle" 
                        value={formData.pumpNozzle} 
                        onChange={handleNozzleChange} 
                        className="dashboard-input"
                    >
                        {availableNozzles.map(nozzle => (
                            <option key={nozzle} value={nozzle}>{nozzle}</option>
                        ))}
                    </select>
                    
                    <input 
                        type="number" 
                        name="startReading" 
                        placeholder="Start Reading" 
                        value={formData.startReading} 
                        onChange={handleChange} 
                        className="dashboard-input" 
                        required 
                    />
                    
                    <input 
                        type="number" 
                        name="endReading" 
                        placeholder="End Reading" 
                        value={formData.endReading} 
                        onChange={handleChange} 
                        className="dashboard-input" 
                        required 
                    />
                    
                    <input 
                        type="number" 
                        name="unitPrice" 
                        placeholder="Unit Price (Rs/L)" 
                        value={formData.unitPrice} 
                        onChange={handleChange} 
                        className="dashboard-input" 
                        required 
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#00ff88', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                            type="checkbox" 
                            name="isRollover" 
                            checked={formData.isRollover} 
                            onChange={handleChange} 
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                        />
                        Meter Rolled Over (Reset to 0)
                    </label>
                </div>

                {/* Cash Collections Section - Like Card Invoices */}
                <div style={{ 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    borderRadius: '10px', 
                    padding: '15px', 
                    marginBottom: '15px',
                    borderLeft: '4px solid #ff9900'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <h4 style={{ color: '#ff9900', margin: 0 }}>💰 Cash Collections / Deposits</h4>
                        <button 
                            type="button" 
                            onClick={() => setShowCashModal(true)} 
                            className="dashboard-button dashboard-button-warning"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                            ➕ Add Collection ({cashCollections.length})
                        </button>
                    </div>
                    
                    {/* Display cash collections list */}
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {cashCollections.map((collection, idx) => (
                            <div key={collection.id || idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                marginBottom: '5px',
                                borderRadius: '6px',
                                fontSize: '13px'
                            }}>
                                <span>🕐 {collection.time} - <strong>Rs. {Number(collection.amount).toLocaleString()}</strong></span>
                                <span style={{ color: '#888' }}>👤 {collection.receivedBy}</span>
                                <button 
                                    type="button"
                                    onClick={() => removeCashCollection(idx)}
                                    style={{
                                        background: '#ff4d4d',
                                        border: 'none',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {cashCollections.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#666', padding: '10px', fontSize: '12px' }}>
                                No cash collections added yet. Click "Add Collection" to record cash deposits.
                            </p>
                        )}
                    </div>
                    
                    <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(255, 153, 0, 0.1)', borderRadius: '6px', textAlign: 'right' }}>
                        <span style={{ fontSize: '13px' }}>💰 Total Cash Collected: </span>
                        <strong style={{ color: '#ff9900', fontSize: '18px' }}>Rs. {calculateTotalCash().toLocaleString()}</strong>
                    </div>
                </div>

                <div className="form-row">
                    <button 
                        type="button" 
                        onClick={() => setShowCardModal(true)} 
                        className="dashboard-button dashboard-button-warning"
                    >
                        💳 Card Bills ({cardInvoices.length})
                    </button>
                    
                    <input 
                        type="number" 
                        name="vouchers" 
                        placeholder="Vouchers Amount" 
                        value={formData.vouchers} 
                        onChange={handleChange} 
                        className="dashboard-input" 
                        style={{ maxWidth: '200px' }}
                    />
                </div>

                <div className="stats-panel">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-label">📊 Liters Sold</div>
                            <div className="stat-value">{calc.liters.toFixed(2)} L</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">💰 Total Sales</div>
                            <div className="stat-value">Rs. {calc.sales.toFixed(2)}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">💵 Cash Collected</div>
                            <div className="stat-value stat-value-warning">Rs. {calc.totalCash.toFixed(2)}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">💳 Card Payments</div>
                            <div className="stat-value stat-value-warning">Rs. {calc.totalCard.toFixed(2)}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">{calc.shortage < 0 ? '⚠️ Shortage' : '✅ Over/Surplus'}</div>
                            <div className={calc.shortage < 0 ? 'stat-value stat-value-danger' : 'stat-value'}>
                                Rs. {Math.abs(calc.shortage).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" className="dashboard-button" style={{ flex: 1 }}>
                        {editId ? '✏️ Update Record' : '💾 Save Full Shift Record'}
                    </button>
                    {editId && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                setEditId(null); 
                                setCardInvoices([]); 
                                setCashCollections([]);
                                setFormData({...formData, startReading: '', endReading: '', isRollover: false});
                                fetchLastReading(formData.fuelType, formData.pumpNozzle); 
                            }} 
                            className="dashboard-button"
                            style={{ background: '#333', color: '#fff' }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>

            {/* Data Table */}
            <div className="dashboard-card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Employee</th>
                                <th>Fuel Type</th>
                                <th>Nozzle</th>
                                <th>Total (Rs)</th>
                                <th>Shortage</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e, index) => (
                                <tr key={e._id}>
                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                    <td>{e.employee}</td>
                                    <td>{e.fuelType}</td>
                                    <td>{e.pumpNozzle || '-'}</td>
                                    <td>Rs. {e.totalSales?.toFixed(2)}</td>
                                    <td style={{ color: e.shortage < 0 ? '#ff4d4d' : '#00ff88' }}>
                                        Rs. {e.shortage?.toFixed(2)}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                onClick={() => handleEdit(e)} 
                                                className="action-btn action-edit"
                                                title="Edit Record"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(e._id)} 
                                                className="action-btn action-delete"
                                                title="Delete Record"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cash Collections Modal */}
            {showCashModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ color: '#ff9900', marginTop: 0, marginBottom: '20px' }}>💰 Add Cash Collection</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#888' }}>Amount (Rs)</label>
                                <input 
                                    type="number" 
                                    placeholder="Enter amount" 
                                    value={cashInput.amount} 
                                    onChange={e => setCashInput({...cashInput, amount: e.target.value})} 
                                    className="dashboard-input"
                                    autoFocus
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#888' }}>Time / Shift</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., 9:00 AM, First collection" 
                                    value={cashInput.time} 
                                    onChange={e => setCashInput({...cashInput, time: e.target.value})} 
                                    className="dashboard-input"
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#888' }}>Received By</label>
                                <input 
                                    type="text" 
                                    placeholder="Who received this cash?" 
                                    value={cashInput.receivedBy} 
                                    onChange={e => setCashInput({...cashInput, receivedBy: e.target.value})} 
                                    className="dashboard-input"
                                />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                onClick={() => setShowCashModal(false)} 
                                className="dashboard-button"
                                style={{ background: '#333', color: '#fff' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    handleAddCashCollection();
                                    setShowCashModal(false);
                                }} 
                                className="dashboard-button dashboard-button-warning"
                            >
                                Add Collection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card Invoice Modal */}
            {showCardModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ color: '#00ff88', marginTop: 0, marginBottom: '20px' }}>💳 Enter Card Invoices</h3>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <input 
                                type="text" 
                                placeholder="Invoice Number" 
                                value={invoiceInput.invoiceNo} 
                                onChange={e => setInvoiceInput({...invoiceInput, invoiceNo: e.target.value})} 
                                className="dashboard-input"
                                style={{ flex: '1' }}
                            />
                            <input 
                                type="number" 
                                placeholder="Amount (Rs)" 
                                value={invoiceInput.amount} 
                                onChange={e => setInvoiceInput({...invoiceInput, amount: e.target.value})} 
                                className="dashboard-input"
                                style={{ flex: '1' }}
                            />
                            <button 
                                type="button" 
                                onClick={handleAddCardInvoice} 
                                className="dashboard-button"
                            >
                                Add Invoice
                            </button>
                        </div>
                        
                        <ul style={{ listStyle: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
                            {cardInvoices.map((inv, index) => (
                                <li key={index} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '12px', 
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                    marginBottom: '8px', 
                                    borderRadius: '8px'
                                }}>
                                    <span>🧾 Invoice: <strong>{inv.invoiceNo}</strong></span>
                                    <span>💰 Rs. {inv.amount}</span>
                                    <button 
                                        onClick={() => removeCardInvoice(index)} 
                                        style={{ 
                                            backgroundColor: '#ff4d4d', 
                                            color: '#fff', 
                                            border: 'none',
                                            padding: '5px 10px',
                                            borderRadius: '5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                        
                        {cardInvoices.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No card invoices added yet</p>
                        )}
                        
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setShowCardModal(false)} 
                                className="dashboard-button"
                                style={{ background: '#333', color: '#fff' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;