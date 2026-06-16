import sharp from 'sharp';

async function test() {
  try {
    const meta = await sharp('game_runs/NeonTowerDefense/assets/tiles/cyber_grid_blue.png').metadata();
    console.log('Image Metadata:', meta);
  } catch (err) {
    console.error('Error reading image:', err);
  }
}

test();
