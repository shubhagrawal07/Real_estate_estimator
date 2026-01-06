import { Router } from 'express';
import { PropertyEstimateService } from './property-estimate.service';
import { validatePropertyEstimate } from '../../middleware/validate.middleware';

const router = Router();
const propertyEstimateService = new PropertyEstimateService();

router.post('/', validatePropertyEstimate, async (req, res) => {
  try {
    const estimate = await propertyEstimateService.createEstimate(req.body);
    res.status(201).json(estimate);
  } catch (error) {
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to create estimate',
      error: error 
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const estimates = await propertyEstimateService.findAll();
    res.json(estimates);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch estimates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    const estimate = await propertyEstimateService.findOne(id);
    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }
    
    res.json(estimate);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch estimate',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
