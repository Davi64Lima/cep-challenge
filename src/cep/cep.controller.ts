import { Controller, Get, Param } from '@nestjs/common';
import { CepService } from './cep.service';

@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(':cep')
  findOne(@Param('cep') cep: string) {
    return this.cepService.findByCep(+cep);
  }
}
