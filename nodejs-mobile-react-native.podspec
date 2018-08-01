require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name                  = package['name']
  s.version               = package['version'].sub('-beta', '')
  s.license               = { :type => 'MIT' }
  s.homepage              = package['homepage']
  s.authors               = package['author']
  s.summary               = package['description']
  s.source                = { :git => package['repository']['url'] }
  s.source_files          = 'ios/*.{h,m,mm}'
  s.source_files          = 'ios/**/**/*.{h}'
  s.platform              = :ios, '8.0'
  s.static_framework      = true
  s.cocoapods_version     = ">= 1.2.0"
  s.dependency            'React'
end
