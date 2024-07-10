import groq from 'groq'
export const ROOT_QUERY = groq`*[_type == 'settings'][0]`
export const WorksQuery = groq`*[_type == 'work' && type->slug.current == $role]{..., 'videoBannerURL': videoBanner.asset->url, 'imageBannerURL': imageBanner.asset->url}`
export const WorkQuery = groq`*[_type == "work" && slug.current == $slug][0]{..., 'imageBannerURL': imageBanner.asset->url, 'filePreviews': documentPreviews[]{..., 'fileSource': uploadSource.asset->}}`
export const RoleQuery = groq`*[_type == 'category' && slug.current == $role][0]`
export const ServiceQuery = groq`*[_type == 'service' && slug.current == $service][0]{ 
  ..., 
  'scenes': scenes[]{
    title, subtitle,
    'highlightedWorks': highlightedWorks[]->
  }
}`
export const bannersQuery = groq`*[_type == 'demo' && slug.current == 'banners'][0].files[]{'source': uploadSource.asset->{url, mimeType, _id}}`
export const bioQuery = groq`*[_type == 'bio'][0] {
  ..., 
  'bioURL': cv.asset->url
}`
