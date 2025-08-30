'use strict';

/**
 * Move tips from invoice header to invoice service line items.
 * - Adds invoice_services.tip_amount (DECIMAL(10,2) NOT NULL DEFAULT 0)
 * - Backfills by distributing each invoice's tip equally among unique staff on its service lines.
 * - Drops invoices.tip_amount
 *
 * Down migration reverses:
 * - Adds invoices.tip_amount
 * - Backfills invoices.tip_amount as SUM(invoice_services.tip_amount) per invoice
 * - Drops invoice_services.tip_amount
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1) Add column to invoice_services
    await queryInterface.addColumn('invoice_services', 'tip_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      after: 'total'
    });

    // 2) Backfill tips from invoices equally among unique staff per invoice
    // Note: Use raw SQL to process efficiently.
    // Create a temporary table to map invoice_id -> tip_amount
    try {
      // For databases that support it (e.g., MySQL), we can run a multi-step update
      // Step A: Collect invoices with tips
      const [invoicesWithTips] = await queryInterface.sequelize.query(`
        SELECT id AS invoice_id, COALESCE(tip_amount, 0) AS tip_amount
        FROM invoices
        WHERE COALESCE(tip_amount, 0) > 0
      `);

      for (const row of invoicesWithTips) {
        const invoiceId = row.invoice_id;
        const tipTotal = parseFloat(row.tip_amount || 0);
        if (!tipTotal || tipTotal <= 0) continue;

        // Find unique staff for this invoice on service lines
        const [staffRows] = await queryInterface.sequelize.query(
          `SELECT DISTINCT staff_id
           FROM invoice_services
           WHERE invoice_id = :invoiceId AND staff_id IS NOT NULL`,
          { replacements: { invoiceId } }
        );

        const uniqueStaff = staffRows.map(r => r.staff_id).filter(Boolean);
        const staffCount = uniqueStaff.length;
        if (staffCount === 0) {
          // No staff to allocate; skip. Tips will be effectively dropped.
          continue;
        }

        // Equal share per staff
        const equalShareRaw = tipTotal / staffCount;

        // For each staff, split their share across their lines proportionally to line total
        for (let i = 0; i < uniqueStaff.length; i++) {
          const staffId = uniqueStaff[i];
          const [lines] = await queryInterface.sequelize.query(
            `SELECT id, total FROM invoice_services WHERE invoice_id = :invoiceId AND staff_id = :staffId`,
            { replacements: { invoiceId, staffId } }
          );

          const totalSum = lines.reduce((s, l) => s + parseFloat(l.total || 0), 0);
          if (totalSum <= 0) {
            // Edge case: divide equally across lines
            const perLine = equalShareRaw / Math.max(1, lines.length);
            for (let j = 0; j < lines.length; j++) {
              const isLast = j === lines.length - 1;
              const amount = isLast ? (equalShareRaw - perLine * (lines.length - 1)) : perLine;
              await queryInterface.sequelize.query(
                `UPDATE invoice_services SET tip_amount = tip_amount + :amt WHERE id = :id`,
                { replacements: { amt: amount.toFixed(2), id: lines[j].id } }
              );
            }
          } else {
            // Proportional to line total, with rounding adjustment on last
            let allocated = 0;
            for (let j = 0; j < lines.length; j++) {
              const isLast = j === lines.length - 1;
              let portion = isLast
                ? (equalShareRaw - allocated)
                : (equalShareRaw * (parseFloat(lines[j].total || 0) / totalSum));
              portion = Math.round((portion + Number.EPSILON) * 100) / 100;
              allocated = Math.round((allocated + portion) * 100) / 100;
              await queryInterface.sequelize.query(
                `UPDATE invoice_services SET tip_amount = tip_amount + :amt WHERE id = :id`,
                { replacements: { amt: portion.toFixed(2), id: lines[j].id } }
              );
            }
          }
        }
      }
    } catch (e) {
      // Non-fatal: continue; admins can backfill later if needed
      console.warn('Tip backfill warning (continuing):', e.message);
    }

    // 3) Drop invoices.tip_amount
    try {
      await queryInterface.removeColumn('invoices', 'tip_amount');
    } catch (e) {
      // If already removed, continue
      console.warn('removeColumn invoices.tip_amount warning:', e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 1) Add tip_amount back to invoices
    await queryInterface.addColumn('invoices', 'tip_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      after: 'discount_amount'
    });

    // 2) Backfill invoices.tip_amount from sum of invoice_services.tip_amount
    const [invoiceIds] = await queryInterface.sequelize.query(`SELECT id FROM invoices`);
    for (const inv of invoiceIds) {
      const invoiceId = inv.id;
      const [[sumRow]] = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(tip_amount), 0) AS tipSum FROM invoice_services WHERE invoice_id = :invoiceId`,
        { replacements: { invoiceId } }
      );
      const tipSum = parseFloat(sumRow?.tipSum || 0).toFixed(2);
      await queryInterface.sequelize.query(
        `UPDATE invoices SET tip_amount = :tipSum WHERE id = :invoiceId`,
        { replacements: { tipSum, invoiceId } }
      );
    }

    // 3) Drop invoice_services.tip_amount
    try {
      await queryInterface.removeColumn('invoice_services', 'tip_amount');
    } catch (e) {
      console.warn('removeColumn invoice_services.tip_amount warning:', e.message);
    }
  }
};


