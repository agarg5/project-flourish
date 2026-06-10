import { ACTIONS } from '../data/actions';
import { AGES } from '../data/ages';
import { BIOMES } from '../data/biomes';
import { BUILDINGS } from '../data/buildings';
import { SPECIES } from '../data/species';
import { TECHS } from '../data/tech';
import type { Content } from './types';

export const DEFAULT_CONTENT: Content = {
  ages: AGES,
  techs: TECHS,
  species: SPECIES,
  buildings: BUILDINGS,
  actions: ACTIONS,
  biomes: BIOMES,
};
