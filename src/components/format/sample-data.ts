import type { PaperData } from "./types";

export const SAMPLE_PAPER: PaperData = {
  title: "Deep Learning Approaches for Multi-Modal Brain Connectome Classification in Neurodegenerative Disorders",
  authors: "Raj Patel, Elena Vance, Marcus Thorne",
  affiliations: "Department of Neuroengineering and Data Science, KvantaLabs Research Institute",
  abstract: "Automated diagnosis of neurodegenerative disorders using resting-state functional MRI (rs-fMRI) and diffusion tensor imaging (DTI) remains a formidable challenge due to high dimensionality and non-Euclidean topology of neural connectomes. In this paper, we introduce a graph transformer framework with spectral attention for joint structural-functional connectome representation learning. Evaluated across 800+ subjects from OpenNeuro and ADNI datasets, our model achieves 94.6% classification accuracy and reveals biomarker sub-networks in the default mode network.",
  keywords: "Connectome, Graph Neural Networks, rs-fMRI, DTI, Neuroimaging, Alzheimer's Disease, Deep Learning",
  sections: [
    {
      id: "sec-1",
      title: "Introduction",
      content: "Neuroimaging techniques such as functional magnetic resonance imaging (fMRI) and diffusion tensor imaging (DTI) provide non-invasive windows into human brain architecture. Recent advances in deep learning have demonstrated significant potential in identifying subtle neural biomarkers associated with early-stage neurodegeneration [1]. However, conventional convolutional neural networks struggle with the intrinsic graph structure of brain connectomes, often discarding crucial topological relationships [2].",
    },
    {
      id: "sec-2",
      title: "Methodology",
      content: "We formulate the human brain as an attributed graph G = (V, E, W), where V represents cortical and subcortical regions derived from the Schaefer-400 parcellation, and E denotes inter-regional structural and functional connectivity [3]. Our proposed architecture combines a spectral graph convolution layer with multi-head spatial self-attention to capture both localized and long-range neural dynamics simultaneously.",
    },
    {
      id: "sec-3",
      title: "Experimental Setup and Results",
      content: "Experiments were conducted on 824 clinical subjects aggregated across OpenNeuro, ADNI-3, and OASIS-3 repositories. Preprocessing followed standard fMRIPrep and QSIPrep pipelines. Baseline models included BrainNetCNN [4], GCN [5], and GraphSAGE. Our model demonstrated statistically significant improvements in ROC-AUC (0.962 vs. 0.914) and balanced accuracy across five-fold cross validation.",
    },
    {
      id: "sec-4",
      title: "Discussion and Future Work",
      content: "Feature importance maps generated via integrated gradients revealed localized disruptions within the default mode network (DMN) and frontoparietal control network (FPCN). These findings corroborate recent clinical neuropathology studies [6]. Future extensions will integrate longitudinal PET scan modalities and dynamic temporal graph formulations.",
    },
    {
      id: "sec-5",
      title: "Conclusion",
      content: "We presented an end-to-end multi-modal graph transformer for brain connectome classification that outperforms standard deep learning benchmarks on open neuroscience datasets while offering biologically interpretable attention weights.",
    },
  ],
  references: [
    "Patel, R., & Thorne, M. (2025). Graph neural networks for neuroimaging biomarker discovery. IEEE Transactions on Medical Imaging, 44(4), 1120-1132.",
    "Smith, S. M., Nichols, T. E., & Miller, K. L. (2023). Network modelling methods for FMRI. NeuroImage, 80, 144-168.",
    "Schaefer, A., et al. (2018). Local-Global Parcellation of the Human Cerebral Cortex from Intrinsic Functional Connectivity MRI. Cerebral Cortex, 28(9), 3095-3114.",
    "Kawahara, J., et al. (2017). BrainNetCNN: Predicting brain networks using convolutional neural networks. NeuroImage, 146, 1038-1049.",
    "Kipf, T. N., & Welling, M. (2017). Semi-Supervised Classification with Graph Convolutional Networks. In ICLR 2017.",
    "Seeley, W. W., et al. (2009). Neurodegenerative Diseases Target Large-Scale Human Brain Networks. Neuron, 62(1), 42-52.",
  ],
};
