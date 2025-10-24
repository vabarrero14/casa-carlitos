import React from 'react';

const Reports = () => {
  return (
    <div className="page">
      <h2>📊 Reportes e Informes</h2>
      <div className="action-buttons">
        <button className="big-btn">💰 Ventas del Día</button>
        <button className="big-btn">📈 Ventas del Mes</button>
        <button className="big-btn">📦 Inventario Actual</button>
        <button className="big-btn">⭐ Productos Más Vendidos</button>
        <button className="big-btn">📋 Reporte General</button>
      </div>
    </div>
  );
};

export default Reports;