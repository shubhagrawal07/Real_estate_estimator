import { Router } from 'express';
import { PropertyEstimateService } from './property-estimate.service';
import { validatePropertyEstimate } from '../../middleware/validate.middleware';
import { optionalAuth, authenticateToken, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { PropertyEstimateRepo } from './property-estimate.repo';

const router = Router();
const propertyEstimateService = new PropertyEstimateService();
const propertyEstimateRepo = new PropertyEstimateRepo();

router.post('/', optionalAuth, validatePropertyEstimate, async (req: AuthenticatedRequest, res) => {
  try {
    const estimate = await propertyEstimateService.createEstimate(req.body, req.userId);
    res.status(201).json(estimate);
  } catch (error) {
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to create estimate',
      error: error 
    });
  }
});

// Get user's estimates (must be before /:id route)
router.get('/user/my-estimates', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const estimates = await propertyEstimateRepo.findByUserId(req.userId);
    res.json(estimates);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch user estimates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Link DRAFT estimates to user when they log in (must be before /:id route)
router.post('/link-drafts', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const { propertyIds } = req.body;
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ message: 'Property IDs array is required' });
    }

    const updatedEstimates = await propertyEstimateRepo.linkDraftEstimatesToUser(propertyIds, req.userId);
    res.json({ 
      message: `Linked ${updatedEstimates.length} estimates to user`,
      estimates: updatedEstimates 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to link draft estimates',
      error: error instanceof Error ? error.message : 'Unknown error'
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

// Recalculate estimate (must be before /:id route)
router.put('/:id/recalculate', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    const updatedEstimate = await propertyEstimateService.recalculateEstimate(id);
    if (!updatedEstimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }
    
    res.json(updatedEstimate);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to recalculate estimate',
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

router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    // First, verify the estimate belongs to the authenticated user
    const estimate = await propertyEstimateService.findOne(id);
    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    // Check if the user owns this estimate
    if (estimate.userId !== req.userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this estimate' });
    }

    const deleted = await propertyEstimateService.deleteEstimate(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete estimate',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
