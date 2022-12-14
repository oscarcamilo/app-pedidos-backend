import { service } from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
  HttpErrors,
} from '@loopback/rest';
import { Llaves } from '../config/llaves';
import {Credenciales, Persona, ResetearClave} from '../models';
import {PersonaRepository} from '../repositories';
import { AutenticacionService } from '../services';
const fetch = require('node-fetch');

export class PersonaController {
  constructor(
    @repository(PersonaRepository)
    public personaRepository : PersonaRepository,
    @service(AutenticacionService)
    public servicioAutenticacion: AutenticacionService
  ) {}
  @post("/identificarPersona", {
    responses:{
      '200':{
        description: "iIdentificacion de usuarios"
      }
    }
  })
  async identificarPersona(
    @requestBody() credenciales: Credenciales
  ){
    let p = await this.servicioAutenticacion.IdentificarPersona(credenciales.usuario, credenciales.clave)
    if(p){
      let token = this.servicioAutenticacion.GenerarTokenJWT(p);
      return{
        datos:{
          nombre: p.nombres,
          correo: p.correo,
          id: p.id
        },
        tk: token
      }
    }else{
      throw new HttpErrors[401]("Datos invalidos");//401= ERROR usuario no autorizado
    }
  }

  @post('/personas')
  @response(200, {
    description: 'Persona model instance',
    content: {'application/json': {schema: getModelSchemaRef(Persona)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {
            title: 'NewPersona',
            exclude: ['id'],
          }),
        },
      },
    })
    persona: Omit<Persona, 'id'>,
  ): Promise<Persona> {

  let clave = this.servicioAutenticacion.GenerarClave();
  let claveCifrada = this.servicioAutenticacion.CifrarClave(clave);
  persona.clave = claveCifrada;
  let p = await this.personaRepository.create(persona);

  //notificar al usuario por correo y sms
  let destino = persona.correo;
  let asunto = 'Registro en la plataforma';
  let contenido = `Hola ${persona.nombres}, su nombre de usuario es: ${persona.correo} y su contrase??a es: ${clave}`;//comilla inclinada
  let destinoSms = persona.celular;
  
  fetch(`${Llaves.urlServicioNotificaciones}/correo-electronico?destino=${destino}&asunto=${asunto}&contenido=${contenido}`)
  fetch(`${Llaves.urlServicioNotificaciones}/sms?telefono=${destinoSms}&mensaje=${contenido}`)
    .then((data: any) =>{
      console.log(data);
    })
    return p;  
  }

  

  @get('/personas/count')
  @response(200, {
    description: 'Persona model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Persona) where?: Where<Persona>,
  ): Promise<Count> {
    return this.personaRepository.count(where);
  }

  @get('/personas')
  @response(200, {
    description: 'Array of Persona model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Persona, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Persona) filter?: Filter<Persona>,
  ): Promise<Persona[]> {
    return this.personaRepository.find(filter);
  }

  @patch('/personas')
  @response(200, {
    description: 'Persona PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {partial: true}),
        },
      },
    })
    persona: Persona,
    @param.where(Persona) where?: Where<Persona>,
  ): Promise<Count> {
    return this.personaRepository.updateAll(persona, where);
  }  

  @get('/personas/{id}')
  @response(200, {
    description: 'Persona model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Persona, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Persona, {exclude: 'where'}) filter?: FilterExcludingWhere<Persona>
  ): Promise<Persona> {
    return this.personaRepository.findById(id, filter);
  }

  @patch('/personas/{id}')
  @response(204, {
    description: 'Persona PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {partial: true}),
        },
      },
    })
    persona: Persona,
  ): Promise<void> {
    await this.personaRepository.updateById(id, persona);
  }

  @put('/personas/{id}')
  @response(204, {
    description: 'Persona PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() persona: Persona,
  ): Promise<void> {
    await this.personaRepository.replaceById(id, persona);
  }

  @del('/personas/{id}')
  @response(204, {
    description: 'Persona DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.personaRepository.deleteById(id);
  }

  
  @post('/recuperarPassword')
  @response(200, {
    content: { 'application/json': { schema: getModelSchemaRef(ResetearClave) } },
  })
  async resetPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ResetearClave),

        },
      },
    })
    resetearClave: ResetearClave,
  ): Promise<Object> {

    let persona = await this.personaRepository.findOne({ where: {correo: resetearClave.mail } })
    if (!persona) {
      throw new HttpErrors[401]("Este usuario no existe");
    }
    let clave = this.servicioAutenticacion.GenerarClave();
    let claveCifrada = this.servicioAutenticacion.CifrarClave(clave);
    persona.clave = claveCifrada;
    await this.personaRepository.update(persona);

    //notificar al usuario por sms

    let contenido = `Hola ${persona.nombres}, su nueva contrase??a es: ${clave}`;
    let destinoSms = persona.celular;

    fetch(`${Llaves.urlServicioNotificaciones}/sms?telefono=${destinoSms}&mensaje=${contenido}`)
      .then((data: any) => {
        console.log(data);
      })
    return {
      envio: "OK"
    };

  }
}
