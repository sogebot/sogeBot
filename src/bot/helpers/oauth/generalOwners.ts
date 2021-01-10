let generalOwners: string[] = [];

function setGeneralOwners(value: typeof generalOwners) {
  generalOwners = value;
}

export { setGeneralOwners, generalOwners };