const { v4: uuidv4 } = require('uuid');
const { Expert } = require('../models');

// Admin: list experts
const listExperts = async (req, res) => {
  try {
    const experts = await Expert.findAll({ order: [['created_at', 'DESC']] });
    return res.json({ success: true, experts });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error fetching experts', error: e.message });
  }
};

// Admin: create
const createExpert = async (req, res) => {
  try {
    const { name, position, bio, image, is_active = true } = req.body;
    if (!name) return res.status(400).json({ success:false, message:'Name required' });
    const expert = await Expert.create({ id: uuidv4(), name, position, bio, image, is_active });
    return res.status(201).json({ success:true, expert });
  } catch (e) { return res.status(500).json({ success:false, message:'Error', error:e.message }); }
};

// Admin: update
const updateExpert = async (req,res)=>{
  try{
    const { id } = req.params;
    const expert = await Expert.findByPk(id);
    if(!expert) return res.status(404).json({ success:false, message:'Not found' });
    const { name, position, bio, image, is_active } = req.body;
    await expert.update({ name, position, bio, image, is_active });
    return res.json({ success:true, expert });
  }catch(e){ return res.status(500).json({ success:false, message:'Error', error:e.message }); }
};

// Admin: delete
const deleteExpert = async (req,res)=>{
  try{ const { id } = req.params; const expert = await Expert.findByPk(id); if(!expert) return res.status(404).json({ success:false, message:'Not found' }); await expert.destroy(); return res.json({ success:true, message:'Deleted' }); }catch(e){ return res.status(500).json({ success:false, message:'Error', error:e.message }); }
};

// Public list active experts
const getPublicExperts = async (req,res)=>{
  try{ const experts = await Expert.findAll({ where:{ is_active:true }, order:[['created_at','DESC']], attributes:['id','name','position','bio','image']}); return res.json({ success:true, experts }); }catch(e){ return res.status(500).json({ success:false, message:'Error', error:e.message }); }
};

module.exports = { listExperts, createExpert, updateExpert, deleteExpert, getPublicExperts }; 