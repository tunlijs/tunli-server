import {readConfigs} from '@pfeiferio/konfi'
import {mergeObjects} from "@pfeiferio/object-utils";
import {join} from "path";
import type {AppConfig} from "#types/types";

export let config: AppConfig = {} as AppConfig

export const loadConfig = (confDir: string, files: string[]) => {
  config = mergeObjects(config, readConfigs(files.map(file => join(confDir, file)))) as AppConfig
}
