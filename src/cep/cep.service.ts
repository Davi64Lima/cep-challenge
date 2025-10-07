import { Injectable } from '@nestjs/common';

@Injectable()
export class CepService {
  findByCep(cep: number) {
    return `This action returns a #${cep}`;
  }
}
