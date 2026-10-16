moved {
  from = module.shared.aws_s3_bucket.uploads
  to   = module.storage.aws_s3_bucket.uploads
}

moved {
  from = module.shared.aws_s3_bucket_versioning.uploads
  to   = module.storage.aws_s3_bucket_versioning.uploads
}

moved {
  from = module.shared.aws_s3_bucket_server_side_encryption_configuration.uploads
  to   = module.storage.aws_s3_bucket_server_side_encryption_configuration.uploads
}

moved {
  from = module.shared.aws_s3_bucket_public_access_block.uploads
  to   = module.storage.aws_s3_bucket_public_access_block.uploads
}

moved {
  from = module.shared.aws_s3_bucket.backups
  to   = module.storage.aws_s3_bucket.backups
}

moved {
  from = module.shared.aws_s3_bucket_versioning.backups
  to   = module.storage.aws_s3_bucket_versioning.backups
}

moved {
  from = module.shared.aws_s3_bucket_server_side_encryption_configuration.backups
  to   = module.storage.aws_s3_bucket_server_side_encryption_configuration.backups
}

moved {
  from = module.shared.aws_s3_bucket_public_access_block.backups
  to   = module.storage.aws_s3_bucket_public_access_block.backups
}

moved {
  from = module.shared.aws_s3_bucket_lifecycle_configuration.backups
  to   = module.storage.aws_s3_bucket_lifecycle_configuration.backups
}

moved {
  from = module.shared.aws_kms_key.storage
  to   = module.storage.aws_kms_key.storage
}

moved {
  from = module.shared.aws_kms_alias.storage
  to   = module.storage.aws_kms_alias.storage
}

moved {
  from = module.shared.aws_vpc.main
  to   = module.vpc.aws_vpc.this
}

moved {
  from = module.shared.aws_internet_gateway.main
  to   = module.vpc.aws_internet_gateway.this
}

moved {
  from = module.shared.aws_subnet.public
  to   = module.vpc.aws_subnet.public
}

moved {
  from = module.shared.aws_subnet.private
  to   = module.vpc.aws_subnet.private
}

moved {
  from = module.shared.aws_eip.nat
  to   = module.vpc.aws_eip.nat
}

moved {
  from = module.shared.aws_nat_gateway.main
  to   = module.vpc.aws_nat_gateway.this
}

moved {
  from = module.shared.aws_route_table.public
  to   = module.vpc.aws_route_table.public
}

moved {
  from = module.shared.aws_route_table.private
  to   = module.vpc.aws_route_table.private[0]
}

moved {
  from = module.shared.aws_route_table_association.public
  to   = module.vpc.aws_route_table_association.public
}

moved {
  from = module.shared.aws_route_table_association.private
  to   = module.vpc.aws_route_table_association.private
}
