import {Model, model, property} from '@loopback/repository';

@model()
export class ResetearClave extends Model {
  @property({
    type: 'string',
    required: true,
  })
  mail: string;


  constructor(data?: Partial<ResetearClave>) {
    super(data);
  }
}

export interface ResetearClaveRelations {
  // describe navigational properties here
}

export type ResetearClaveWithRelations = ResetearClave & ResetearClaveRelations;
