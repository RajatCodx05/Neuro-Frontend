export type Repository = {
  id: string;
  name: string;
  short: string;
  datasets: number;
  tier: "Open" | "Registered" | "Restricted";
  status: "online" | "syncing" | "offline";
  lastSync: string;
  color: string;
  url?: string;
};

export const repositories: Repository[] = [
  { id: "openneuro", name: "OpenNeuro", short: "ON", datasets: 1204, tier: "Open", status: "online", lastSync: "2 min ago", color: "from-cyan-400 to-blue-500", url: "https://openneuro.org/" },
  { id: "dandi", name: "DANDI Archive", short: "DA", datasets: 862, tier: "Open", status: "online", lastSync: "5 min ago", color: "from-blue-400 to-indigo-500", url: "https://dandiarchive.org/" },
  { id: "nitrc", name: "NITRC", short: "NI", datasets: 431, tier: "Open", status: "syncing", lastSync: "12 min ago", color: "from-teal-400 to-cyan-500", url:"https://www.nitrc.org/" },
  { id: "nemar", name: "NEMAR", short: "NE", datasets: 289, tier: "Open", status: "online", lastSync: "8 min ago", color: "from-sky-400 to-cyan-500", url: "https://nemar.org/" },
  { id: "allen", name: "Allen Brain Atlas", short: "AB", datasets: 156, tier: "Open", status: "online", lastSync: "1 hr ago", color: "from-purple-400 to-blue-500", url:"https://brain-map.org/atlases" },
  { id: "hcp", name: "Human Connectome", short: "HC", datasets: 96, tier: "Registered", status: "online", lastSync: "20 min ago", color: "from-indigo-400 to-cyan-500", url:'https://www.humanconnectome.org/' },
  { id: "adni", name: "ADNI", short: "AD", datasets: 74, tier: "Restricted", status: "online", lastSync: "35 min ago", color: "from-blue-500 to-purple-500", url:'https://adni.loni.usc.edu/' },
  { id: "ebrains", name: "EBRAINS", short: "EB", datasets: 512, tier: "Open", status: "online", lastSync: "6 min ago", color: "from-cyan-400 to-teal-500", url:'https://ebrains.eu/data-tools-services/data-knowledge/find-data' },
  { id: "ukbb", name: "UK Biobank", short: "UK", datasets: 218, tier: "Restricted", status: "online", lastSync: "1 hr ago", color: "from-blue-400 to-cyan-400", url:'https://www.ukbiobank.ac.uk/projects/analysis-of-biobank-neuro-imaging-data/' },
  { id: "neuromorpho", name: "NeuroMorpho", short: "NM", datasets: 1875, tier: "Open", status: "syncing", lastSync: "3 min ago", color: "from-teal-400 to-blue-500", url:'https://neuromorpho.org/' },
];

export type Dataset = {
  id: string;
  name: string;
  description: string;
  repo: string;
  modality: string;
  region: string;
  ageGroup: string;
  species: string;
  disease: string;
  access: "Open" | "Registered" | "Restricted";
  license: string;
  doi: string;
  verified: string;
  subjects: number;
  size: string;
};

export const datasets: Dataset[] = [
  {
    id: "ds004215", name: "Resting-state fMRI in Pediatric ADHD",
    description: "Multi-site resting-state fMRI dataset of 312 children ages 7-12 with ADHD diagnosis and matched controls.",
    repo: "OpenNeuro", modality: "fMRI", region: "Whole Brain", ageGroup: "Children", species: "Human",
    disease: "ADHD", access: "Open", license: "CC0", doi: "10.18112/openneuro.ds004215.v1.0.2",
    verified: "Dec 12, 2025", subjects: 312, size: "184 GB",
  },
  {
    id: "ds003653", name: "Alzheimer's Longitudinal MRI Cohort",
    description: "T1, T2 and DTI MRI acquired across 5 timepoints in 428 elderly subjects with early-stage Alzheimer's.",
    repo: "ADNI", modality: "MRI", region: "Hippocampus, Cortex", ageGroup: "Elderly", species: "Human",
    disease: "Alzheimer's", access: "Restricted", license: "ADNI DUA", doi: "10.1234/adni.2024.0428",
    verified: "Dec 09, 2025", subjects: 428, size: "612 GB",
  },
  {
    id: "ds002718", name: "EEG in Focal Epilepsy",
    description: "128-channel EEG recordings during resting and task states from 89 patients with focal epilepsy.",
    repo: "NEMAR", modality: "EEG", region: "Temporal Lobe", ageGroup: "Adult", species: "Human",
    disease: "Epilepsy", access: "Open", license: "CC-BY-4.0", doi: "10.18112/openneuro.ds002718",
    verified: "Dec 14, 2025", subjects: 89, size: "42 GB",
  },
  {
    id: "ds001984", name: "MEG Language Task — Autism Spectrum",
    description: "Magnetoencephalography during sentence comprehension in 156 adults on the autism spectrum.",
    repo: "OpenNeuro", modality: "MEG", region: "Left Temporal", ageGroup: "Adult", species: "Human",
    disease: "Autism", access: "Open", license: "CC-BY-4.0", doi: "10.18112/openneuro.ds001984",
    verified: "Dec 11, 2025", subjects: 156, size: "78 GB",
  },
  {
    id: "ds005112", name: "Parkinson's DAT-SCAN PET",
    description: "Dopamine transporter PET imaging in 240 early-stage Parkinson's patients with clinical follow-up.",
    repo: "EBRAINS", modality: "PET", region: "Basal Ganglia", ageGroup: "Elderly", species: "Human",
    disease: "Parkinson's", access: "Registered", license: "EBRAINS", doi: "10.25493/ebrains.2025.0112",
    verified: "Dec 08, 2025", subjects: 240, size: "128 GB",
  },
  {
    id: "ds006201", name: "Rodent Two-Photon Calcium Imaging",
    description: "Cellular-resolution calcium imaging of visual cortex in 62 mice during behavioral tasks.",
    repo: "DANDI", modality: "Calcium", region: "V1", ageGroup: "Adult", species: "Mouse",
    disease: "Healthy", access: "Open", license: "CC0", doi: "10.48324/dandi.006201",
    verified: "Dec 13, 2025", subjects: 62, size: "1.2 TB",
  },
];

export const stats = [
  { label: "Total Datasets", value: 5827, suffix: "+" },
  { label: "Repositories Connected", value: 10, suffix: "" },
  { label: "Verified Links", value: 98.4, suffix: "%" },
  { label: "Today's Searches", value: 12483, suffix: "" },
  { label: "Research Papers Linked", value: 41290, suffix: "" },
  { label: "Avg Search Time", value: 0.42, suffix: "s" },
];
