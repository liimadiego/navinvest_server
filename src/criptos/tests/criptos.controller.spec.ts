import { Test, TestingModule } from '@nestjs/testing';
import { CriptosController } from '../criptos.controller';
import { CriptosService } from '../criptos.service';

describe('CriptosController', () => {
  let controller: CriptosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriptosController],
      providers: [CriptosService],
    }).compile();

    controller = module.get<CriptosController>(CriptosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
