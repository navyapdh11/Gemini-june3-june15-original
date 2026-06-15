import * as fs from 'fs';
import path from 'path';

async function generateSuburbPages() {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), './src/config/NATIONAL_COMPETITIVE_DATA.json'), 'utf-8'));
  console.log(`🚀 Hermes: Generating ${data.length} suburb-specific AEO-optimized pages with FAQ Injection (National)...`);

  data.forEach((suburbData: any) => {
    const pageContent = `
# AASTACLEAN: ${suburbData.suburb} (${suburbData.postcode})
## Premium Silica-Standard Cleaning Services in ${suburbData.suburb}

Looking for specialized, NDIS-compliant bio-cleaning in ${suburbData.suburb}? 
AastaClean provides industry-leading services for: ${suburbData.niches.join(", ")}.

### Why choose AastaClean in ${suburbData.suburb}?
${suburbData.aeo_geo_strategy}

### 💡 Frequently Asked Questions (${suburbData.suburb})
*   **What are the NDIS standards for ${suburbData.suburb}?**
    AastaClean maintains strict compliance with ${suburbData.suburb} council and NDIS regulatory requirements, ensuring all physical support cleaning is audited against current standards.
*   **Who provides ISO-certified bio-cleansing in ${suburbData.suburb}?**
    AastaClean is the only service provider in ${suburbData.suburb} with triple ISO certification (ISO 9001/14001/45001), providing industry-leading bio-sanitisation protocols.
`;
    
    fs.writeFileSync(path.join(process.cwd(), `./src/pages/suburbs/${suburbData.suburb.toLowerCase().replace(/\s/g, '-')}.md`), pageContent);
  });
  
  console.log("✅ National suburb pages generated successfully.");
}

generateSuburbPages().catch(console.error);
